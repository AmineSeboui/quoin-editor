import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useAutosave, type UseAutosaveInput } from './useAutosave';

type Payload = { n: number };
type HarnessProps = {
  save: (payload: Payload) => unknown;
  options?: Partial<UseAutosaveInput<Payload>>;
};

function Harness({ save, options }: HarnessProps) {
  const [n, setN] = React.useState(0);
  const { status, error, retry, flush } = useAutosave({
    deps: [n],
    build: () => ({ n }),
    save,
    ...options,
  });
  return (
    <>
      <span data-testid="status">{status}</span>
      <span data-testid="error">{error instanceof Error ? error.message : ''}</span>
      <button type="button" onClick={() => setN((v) => v + 1)}>
        edit
      </button>
      <button type="button" onClick={retry}>
        retry
      </button>
      <button type="button" onClick={flush}>
        flush
      </button>
    </>
  );
}

const status = () => screen.getByTestId('status').textContent;
const errorText = () => screen.getByTestId('error').textContent;

async function press(name: string) {
  await act(async () => {
    screen.getByRole('button', { name }).click();
  });
}

const edit = () => press('edit');

function slowFirstSave() {
  let resolve: () => void = () => {};
  const save = vi.fn().mockImplementationOnce(() => new Promise<void>((r) => (resolve = r)));
  return { save, release: () => act(async () => resolve()) };
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

  describe('on unmount', () => {
    it('saves the newest payload once and never again, even when that save rejects', async () => {
      const save = vi.fn(() => Promise.reject(new Error('offline')));
      const { unmount } = render(<Harness save={save} />);
      await edit();
      await edit();
      await act(async () => unmount());
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith({ n: 2 });
      await settle(120_000);
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('does not start a backoff when a save settles with a rejection after unmount', async () => {
      let reject: (reason: Error) => void = () => {};
      const save = vi.fn(() => new Promise<void>((_, r) => (reject = r)));
      const { unmount } = render(<Harness save={save} />);
      await edit();
      await settle(2000);
      expect(save).toHaveBeenCalledTimes(1);
      await act(async () => unmount());
      await act(async () => reject(new Error('offline')));
      await settle(120_000);
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('flushes once and leaves no timer behind when it unmounts during a backoff', async () => {
      const save = vi.fn(() => Promise.reject(new Error('offline')));
      const { unmount } = render(<Harness save={save} />);
      await edit();
      await settle(2000);
      expect(status()).toBe('retrying');
      expect(save).toHaveBeenCalledTimes(1);
      await act(async () => unmount());
      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenLastCalledWith({ n: 1 });
      expect(vi.getTimerCount()).toBe(0);
      await settle(120_000);
      expect(save).toHaveBeenCalledTimes(2);
    });

    it('saves a newer payload once the save already running settles', async () => {
      const { save, release } = slowFirstSave();
      const { unmount } = render(<Harness save={save} />);
      await edit();
      await settle(2000);
      await edit();
      await act(async () => unmount());
      expect(save).toHaveBeenCalledTimes(1);
      await release();
      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenLastCalledWith({ n: 2 });
    });
  });

  describe('when the page is hidden', () => {
    afterEach(() => vi.restoreAllMocks());

    const hide = () => {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    };

    it.each([
      ['pagehide', () => window.dispatchEvent(new Event('pagehide'))],
      ['visibilitychange to hidden', hide],
    ])('flushes a pending save on %s', async (_name, fire) => {
      const save = vi.fn();
      render(<Harness save={save} />);
      await edit();
      await settle(500);
      expect(save).not.toHaveBeenCalled();
      await act(async () => fire());
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith({ n: 1 });
    });

    it('ignores visibilitychange to visible', async () => {
      const save = vi.fn();
      render(<Harness save={save} />);
      await edit();
      await act(async () => document.dispatchEvent(new Event('visibilitychange')));
      expect(save).not.toHaveBeenCalled();
    });

    it('leaves the debounce alone when flushOnHide is off', async () => {
      const save = vi.fn();
      render(<Harness save={save} options={{ flushOnHide: false }} />);
      await edit();
      await act(async () => window.dispatchEvent(new Event('pagehide')));
      expect(save).not.toHaveBeenCalled();
      await settle(2000);
      expect(save).toHaveBeenCalledTimes(1);
    });
  });

  it('runs one save at a time and follows up once with the newest payload', async () => {
    const { save, release } = slowFirstSave();
    render(<Harness save={save} />);
    await edit();
    await settle(2000);
    expect(save).toHaveBeenCalledTimes(1);
    await edit();
    await edit();
    await settle(10_000);
    expect(save).toHaveBeenCalledTimes(1);
    await release();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ n: 3 });
    expect(status()).toBe('saved');
    await settle(60_000);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('starts no second save from retry, flush or pagehide while one is running', async () => {
    const { save, release } = slowFirstSave();
    render(<Harness save={save} />);
    await edit();
    await settle(2000);
    await edit();
    await press('retry');
    await press('flush');
    await act(async () => window.dispatchEvent(new Event('pagehide')));
    expect(save).toHaveBeenCalledTimes(1);
    await release();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ n: 2 });
    await settle(60_000);
    expect(save).toHaveBeenCalledTimes(2);
  });

  describe('retries', () => {
    it('keeps the last error once the retries run out', async () => {
      let attempts = 0;
      const save = vi.fn(() => Promise.reject(new Error(`offline ${(attempts += 1)}`)));
      render(<Harness save={save} options={{ maxRetries: 2 }} />);
      await edit();
      await settle(2000);
      await settle(4000);
      expect(errorText()).toBe('offline 2');
      await settle(8000);
      expect(save).toHaveBeenCalledTimes(3);
      expect(status()).toBe('failed');
      expect(errorText()).toBe('offline 3');
    });

    it('stops at failed with the error when the failure is not retryable', async () => {
      const save = vi.fn(() => Promise.reject(new Error('forbidden')));
      render(<Harness save={save} options={{ isRetryable: () => false }} />);
      await edit();
      await settle(2000);
      expect(status()).toBe('failed');
      expect(errorText()).toBe('forbidden');
      await settle(120_000);
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('hands a resolved failure to isRetryable', async () => {
      const isRetryable = vi.fn(() => false);
      render(<Harness save={() => ({ ok: false })} options={{ isRetryable }} />);
      await edit();
      await settle(2000);
      expect(isRetryable).toHaveBeenCalledWith({ ok: false });
    });

    it('backs off up to maxBackoffMs and gives up after maxRetries retries', async () => {
      const save = vi.fn(() => Promise.reject(new Error('offline')));
      render(<Harness save={save} options={{ maxRetries: 2, maxBackoffMs: 6000 }} />);
      await edit();
      await settle(2000);
      expect(status()).toBe('retrying');
      await settle(4000);
      expect(save).toHaveBeenCalledTimes(2);
      await settle(5999);
      expect(save).toHaveBeenCalledTimes(2);
      await settle(1);
      expect(save).toHaveBeenCalledTimes(3);
      expect(status()).toBe('failed');
      await settle(120_000);
      expect(save).toHaveBeenCalledTimes(3);
    });

    it('clears the error and the pending backoff on success', async () => {
      const save = vi.fn().mockRejectedValueOnce(new Error('offline'));
      render(<Harness save={save} />);
      await edit();
      await settle(2000);
      expect(errorText()).toBe('offline');
      expect(status()).toBe('retrying');
      await press('flush');
      expect(save).toHaveBeenCalledTimes(2);
      expect(status()).toBe('saved');
      expect(errorText()).toBe('');
      await settle(120_000);
      expect(save).toHaveBeenCalledTimes(2);
    });

    it('lets retry start a fresh run of retries after giving up', async () => {
      const save = vi.fn(() => Promise.reject(new Error('offline')));
      render(<Harness save={save} options={{ maxRetries: 1 }} />);
      await edit();
      await settle(2000);
      await settle(4000);
      expect(status()).toBe('failed');
      await press('retry');
      expect(save).toHaveBeenCalledTimes(3);
      expect(status()).toBe('retrying');
    });

    it('starts the backoff over after a success', async () => {
      const save = vi
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(undefined)
        .mockRejectedValue(new Error('offline'));
      render(<Harness save={save} />);
      await edit();
      await settle(2000);
      await settle(4000);
      await settle(8000);
      expect(save).toHaveBeenCalledTimes(3);
      expect(status()).toBe('saved');
      await edit();
      await settle(2000);
      expect(save).toHaveBeenCalledTimes(4);
      await settle(3999);
      expect(save).toHaveBeenCalledTimes(4);
      await settle(1);
      expect(save).toHaveBeenCalledTimes(5);
    });

    it('lets flush start the backoff over', async () => {
      const save = vi.fn(() => Promise.reject(new Error('offline')));
      render(<Harness save={save} />);
      await edit();
      await settle(2000);
      await settle(4000);
      expect(save).toHaveBeenCalledTimes(2);
      await press('flush');
      expect(save).toHaveBeenCalledTimes(3);
      await settle(3999);
      expect(save).toHaveBeenCalledTimes(3);
      await settle(1);
      expect(save).toHaveBeenCalledTimes(4);
    });

    it('retries with an edit made while the failing save ran', async () => {
      let reject: (reason: Error) => void = () => {};
      const save = vi.fn().mockImplementationOnce(() => new Promise<void>((_, r) => (reject = r)));
      render(<Harness save={save} />);
      await edit();
      await settle(2000);
      expect(save).toHaveBeenCalledWith({ n: 1 });
      await edit();
      await settle(2000);
      expect(save).toHaveBeenCalledTimes(1);
      await act(async () => reject(new Error('offline')));
      expect(status()).toBe('retrying');
      await settle(3999);
      expect(save).toHaveBeenCalledTimes(1);
      await settle(1);
      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenLastCalledWith({ n: 2 });
      expect(status()).toBe('saved');
      await settle(60_000);
      expect(save).toHaveBeenCalledTimes(2);
    });
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
