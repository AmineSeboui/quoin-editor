import { lazyLoad } from './lazy-load';

function deferredLoad() {
  const settle: { resolve(value: string): void; reject(reason: unknown): void }[] = [];
  const load = vi.fn(() => new Promise<string>((resolve, reject) => settle.push({ resolve, reject })));
  return { load, settle };
}

describe('lazyLoad', () => {
  it('loads once and shares the one promise, then holds the value', async () => {
    const { load, settle } = deferredLoad();
    const lazy = lazyLoad(load);
    expect(load).not.toHaveBeenCalled();
    const first = lazy.load();
    expect(lazy.load()).toBe(first);
    expect(lazy.loaded()).toBeUndefined();
    settle[0].resolve('data');
    expect(await first).toBe('data');
    expect(lazy.loaded()).toBe('data');
    expect(await lazy.load()).toBe('data');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('loads again on the call after a failure, which every caller of the failed load sees', async () => {
    const { load, settle } = deferredLoad();
    const lazy = lazyLoad(load);
    const failed = Promise.all([lazy.load(), lazy.load()]);
    settle[0].reject(new Error('offline'));
    await expect(failed).rejects.toThrow('offline');
    expect(lazy.loaded()).toBeUndefined();
    const retried = lazy.load();
    expect(load).toHaveBeenCalledTimes(2);
    settle[1].resolve('data');
    expect(await retried).toBe('data');
  });

  it('turns a load that throws into a rejection, and tries again on the next call', async () => {
    const load = vi.fn<() => Promise<string>>(() => {
      throw new Error('broken');
    });
    const lazy = lazyLoad(load);
    await expect(lazy.load()).rejects.toThrow('broken');
    load.mockResolvedValueOnce('data');
    expect(await lazy.load()).toBe('data');
  });
});
