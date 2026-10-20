import { render, act } from '@testing-library/react';
import { Harness, status, edit, slowFirstSave, settle } from './test-autosave';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useAutosave', () => {
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
});
