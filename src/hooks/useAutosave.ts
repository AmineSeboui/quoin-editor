import * as React from 'react';
import {
  alwaysRetry,
  attemptSave,
  clearTimer,
  nextRetryDelay,
  type TimerRef,
} from './autosave-backoff';

/** Where a debounced save stands, for a "Saving..." or "Saved" indicator. */
export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'retrying' | 'failed';

/** What `useAutosave` tracks, how to build the payload, and how to persist it. */
export type UseAutosaveInput<T> = {
  /** The tracked fields. An edit to any of them marks dirty and restarts the debounce. */
  deps: React.DependencyList;
  build: () => T;
  /**
   * Persists the payload. Return anything: a mutation or a `fetch` that resolves to a body
   * can be passed straight in. A save fails by rejecting, or by resolving to `{ ok: false }`.
   */
  save: (payload: T) => unknown;
  debounceMs?: number;
  maxBackoffMs?: number;
  /** Retries after a failed save before giving up with status `failed`. Defaults to 8. */
  maxRetries?: number;
  /**
   * Whether a failed save is worth retrying. Receives the rejection, or the resolved
   * `{ ok: false }` value. Return false for a permanent failure. Defaults to always.
   */
  isRetryable?: (error: unknown) => boolean;
  /** Save a pending edit when the page is hidden or closed. Defaults to true. */
  flushOnHide?: boolean;
};

/** The current save status, the last failure, and ways to save immediately. */
export type UseAutosaveResult = {
  status: AutosaveStatus;
  /** The last failure, kept while a retry is pending and cleared by the next success. */
  error: unknown;
  /** Saves now, even when nothing is pending, and starts the retries over. */
  retry: () => void;
  /** Saves a pending edit now and starts the retries over. A no-op when nothing is pending. */
  flush: () => void;
};

/**
 * Debounced last-write-wins autosave. Nothing fires on mount, only after the first real
 * edit. One save runs at a time: edits made while it runs are saved once it settles, as one
 * save of the newest payload. A failed save backs off exponentially until it lands, stops
 * being retryable or runs out of retries. An edit still waiting for its debounce is saved
 * on unmount and when the page is hidden. `save` and `build` are read at fire time, so
 * passing fresh closures each render is safe.
 */
export function useAutosave<T>({
  deps,
  build,
  save,
  debounceMs = 2000,
  maxBackoffMs = 30000,
  maxRetries = 8,
  isRetryable = alwaysRetry,
  flushOnHide = true,
}: UseAutosaveInput<T>): UseAutosaveResult {
  // The effect order below is load-bearing: the dirty flag must be set before the
  // scheduling effect reads it within the same commit, and the "latest closure" refs
  // must be assigned after commit rather than during render.
  const [status, setStatus] = React.useState<AutosaveStatus>('idle');
  const [error, setError] = React.useState<unknown>(null);
  const dirtyRef = React.useRef(false);
  const inFlightRef = React.useRef(false);
  const disposedRef = React.useRef(false);
  const retriesRef = React.useRef(0);
  const debounceRef: TimerRef = React.useRef(null);
  const backoffRef: TimerRef = React.useRef(null);
  const buildRef = React.useRef(build);
  const saveRef = React.useRef(save);
  const runRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    buildRef.current = build;
    saveRef.current = save;
    const policy = { debounceMs, maxBackoffMs, maxRetries, isRetryable };
    runRef.current = () => {
      clearTimer(debounceRef);
      clearTimer(backoffRef);
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      dirtyRef.current = false;
      if (!disposedRef.current) setStatus('saving');
      void (async () => {
        const failure = await attemptSave(() => saveRef.current(buildRef.current()));
        inFlightRef.current = false;
        if (disposedRef.current) {
          if (dirtyRef.current) runRef.current();
          return;
        }
        if (!failure) {
          retriesRef.current = 0;
          setError(null);
          if (dirtyRef.current) runRef.current();
          else setStatus('saved');
          return;
        }
        dirtyRef.current = true;
        setError(failure.error);
        const delay = nextRetryDelay(failure.error, retriesRef.current, policy);
        if (delay === null) {
          setStatus('failed');
          return;
        }
        retriesRef.current += 1;
        setStatus('retrying');
        backoffRef.current = setTimeout(() => runRef.current(), delay);
      })();
    };
  });

  // Compares values rather than counting mounts: React's development remount
  // re-runs this effect with identical deps, and a "have I mounted" flag survives
  // that remount, so a flag marks an untouched editor dirty and autosaves it.
  const seenRef = React.useRef<React.DependencyList | null>(null);
  React.useEffect(() => {
    const seen = seenRef.current;
    seenRef.current = deps;
    if (seen === null) return;
    const unchanged = seen.length === deps.length && seen.every((v, i) => v === deps[i]);
    if (!unchanged) dirtyRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller owns the tracked fields
  }, deps);

  React.useEffect(() => {
    if (!dirtyRef.current) return;
    clearTimer(debounceRef);
    debounceRef.current = setTimeout(() => runRef.current(), debounceMs);
    return () => clearTimer(debounceRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller owns the tracked fields
  }, deps);

  React.useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      clearTimer(debounceRef);
      clearTimer(backoffRef);
      if (dirtyRef.current) runRef.current();
    };
  }, []);

  const retry = React.useCallback(() => {
    retriesRef.current = 0;
    runRef.current();
  }, []);

  const flush = React.useCallback(() => {
    if (dirtyRef.current) retry();
  }, [retry]);

  React.useEffect(() => {
    if (!flushOnHide) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flushOnHide, flush]);

  return { status, error, retry, flush };
}
