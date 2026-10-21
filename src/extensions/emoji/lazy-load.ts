export type LazyLoad<T> = {
  /** The value, loading it on the first call, and again on the call after a load that failed. */
  load(): Promise<T>;
  /** The value once a load has brought it, for a caller that cannot wait. */
  loaded(): T | undefined;
};

/** A value loaded on demand, once: every call while a load runs shares its promise. */
export function lazyLoad<T>(load: () => Promise<T>): LazyLoad<T> {
  let pending: Promise<T> | null = null;
  let value: { readonly current: T } | null = null;
  return {
    load() {
      pending ??= new Promise<T>((resolve) => resolve(load())).then(
        (current) => {
          value = { current };
          return current;
        },
        (reason: unknown) => {
          pending = null;
          throw reason;
        },
      );
      return pending;
    },
    loaded: () => value?.current,
  };
}
