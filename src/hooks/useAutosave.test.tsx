import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useAutosave } from './useAutosave';

function Harness({ save }: { save: (payload: { n: number }) => unknown }) {
  const [n, setN] = React.useState(0);
  const { status } = useAutosave({ deps: [n], build: () => ({ n }), save });
  return (
    <>
      <span data-testid="status">{status}</span>
      <button type="button" onClick={() => setN((v) => v + 1)}>
        edit
      </button>
    </>
  );
}

const status = () => screen.getByTestId('status').textContent;

async function edit() {
  await act(async () => {
    screen.getByRole('button', { name: 'edit' }).click();
  });
}

async function settle(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useAutosave', () => {
  it('stays idle until something is edited', async () => {
    render(<Harness save={() => {}} />);
    await settle(10_000);
    expect(status()).toBe('idle');
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
});
