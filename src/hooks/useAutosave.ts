import * as React from 'react';
import { alwaysRetry } from './autosave-backoff';
import { createSaveRunner, type AutosaveStatus } from './autosave-runner';

export type { AutosaveStatus };

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
  const [status, setStatus] = React.useState<AutosaveStatus>('idle');
  const [error, setError] = React.useState<unknown>(null);
  const latest = { build, save, policy: { debounceMs, maxBackoffMs, maxRetries, isRetryable } };
  const [runner] = React.useState(() => createSaveRunner<T>({ setStatus, setError }, latest));

  // The effect order below is load-bearing: the dirty flag must be set before the
  // scheduling effect reads it within the same commit, and the runner must learn the
  // latest closures after commit rather than during render.
  React.useEffect(() => {
    runner.configure(latest);
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
    if (!unchanged) runner.markDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller owns the tracked fields
  }, deps);

  React.useEffect(() => {
    return runner.schedule(debounceMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller owns the tracked fields
  }, deps);

  React.useEffect(() => {
    runner.mount();
    return runner.dispose;
  }, [runner]);

  React.useEffect(() => {
    if (!flushOnHide) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') runner.flush();
    };
    window.addEventListener('pagehide', runner.flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', runner.flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flushOnHide, runner]);

  return { status, error, retry: runner.retry, flush: runner.flush };
}
