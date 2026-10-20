import { render, act } from '@testing-library/react';
import { Harness, status, press, edit, settle } from './test-autosave';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useAutosave', () => {
  it('stays idle until something is edited', async () => {
    render(<Harness save={() => {}} />);
    await settle(10_000);
    expect(status()).toBe('idle');
  });

  it('saves nothing on flush or unmount when nothing was edited', async () => {
    const save = vi.fn();
    const { unmount } = render(<Harness save={save} />);
    await press('flush');
    await act(async () => unmount());
    await settle(10_000);
    expect(save).not.toHaveBeenCalled();
  });

  /** The reason the signature is `unknown`: a mutation or a fetch that resolves to a body
   *  is the common case, and narrowing it forced every caller to wrap the call purely to
   *  throw the value away. */
  it('treats a resolved body as a success', async () => {
    const save = vi.fn(async () => ({ id: 'doc_1', revision: 7, ok: undefined }));
    render(<Harness save={save} />);
    await edit();
    await settle(2000);
    expect(save).toHaveBeenCalledWith({ n: 1 });
    expect(status()).toBe('saved');
  });

  it.each([
    ['a string', 'written'],
    ['a number', 42],
    ['null', null],
    ['nothing', undefined],
    ['a truthy ok', { ok: true }],
  ])('treats %s as a success', async (_name, value) => {
    render(<Harness save={() => value} />);
    await edit();
    await settle(2000);
    expect(status()).toBe('saved');
  });

  it('treats an explicit ok false as a failure and backs off', async () => {
    const save = vi.fn(() => ({ ok: false as const, error: 'conflict' }));
    render(<Harness save={save} />);
    await edit();
    await settle(2000);
    expect(status()).toBe('retrying');
    await settle(4000);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('treats a rejection as a failure', async () => {
    render(<Harness save={() => Promise.reject(new Error('offline'))} />);
    await edit();
    await settle(2000);
    expect(status()).toBe('retrying');
  });

  it('flush saves the newest payload now and drops the pending debounce', async () => {
    const save = vi.fn();
    render(<Harness save={save} />);
    await edit();
    await edit();
    await press('flush');
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ n: 2 });
    await settle(10_000);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
