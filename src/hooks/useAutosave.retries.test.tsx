import { render, act } from '@testing-library/react';
import { Harness, status, errorText, press, edit, settle } from './test-autosave';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useAutosave', () => {
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
});
