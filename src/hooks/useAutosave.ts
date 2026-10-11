import * as React from 'react';

/** Where a debounced save stands, for a "Saving..." or "Saved" indicator. */
export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'retrying';

/**
 * Whether a resolved save reported failure. Only an explicit `{ ok: false }` counts, so a
 * `save` that resolves to a response body, a mutation result or nothing at all is a success
 * and needs no wrapper to discard its value. Rejecting is still the other way to fail.
 */
function reportedFailure(result: unknown): boolean {
  return (
    typeof result === 'object' &&
    result !== null &&
    'ok' in result &&
    (result as { ok?: unknown }).ok === false
  );
}

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
};

/** The current save status and a way to retry a failed save immediately. */
export type UseAutosaveResult = {
  status: AutosaveStatus;
  retry: () => void;
};

/**
 * Debounced last-write-wins autosave. Nothing fires on mount, only after the first
 * real edit, and a rejected save backs off exponentially until it lands. `save` and
 * `build` are read at fire time, so passing fresh closures each render is safe.
 */
export function useAutosave<T>({
  deps,
  build,
  save,
  debounceMs = 2000,
  maxBackoffMs = 30000,
}: UseAutosaveInput<T>): UseAutosaveResult {
  // The effect order below is load-bearing: the dirty flag must be set before the
  // scheduling effect reads it within the same commit, and the "latest closure" refs
  // must be assigned after commit rather than during render.
  const [status, setStatus] = React.useState<AutosaveStatus>('idle');
  const dirtyRef = React.useRef(false);
  const retryRef = React.useRef(0);
  const backoffRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const buildRef = React.useRef(build);
  const saveRef = React.useRef(save);
  const runRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    buildRef.current = build;
    saveRef.current = save;
    runRef.current = () => {
      void (async () => {
        setStatus('saving');
        try {
          const res = await saveRef.current(buildRef.current());
          if (reportedFailure(res)) throw new Error('save rejected');
          retryRef.current = 0;
          dirtyRef.current = false;
          setStatus('saved');
        } catch {
          setStatus('retrying');
          retryRef.current += 1;
          const delay = Math.min(debounceMs * 2 ** retryRef.current, maxBackoffMs);
          if (backoffRef.current) clearTimeout(backoffRef.current);
          backoffRef.current = setTimeout(() => runRef.current(), delay);
        }
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
    const handle = setTimeout(() => runRef.current(), debounceMs);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller owns the tracked fields
  }, deps);

  React.useEffect(
    () => () => {
      if (backoffRef.current) clearTimeout(backoffRef.current);
    },
    [],
  );

  const retry = React.useCallback(() => {
    if (backoffRef.current) clearTimeout(backoffRef.current);
    runRef.current();
  }, []);

  return { status, retry };
}
