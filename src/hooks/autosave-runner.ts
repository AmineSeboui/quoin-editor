import {
  attemptSave,
  clearTimer,
  nextRetryDelay,
  type RetryPolicy,
  type TimerRef,
} from './autosave-backoff';

/** Where a debounced save stands, for a "Saving..." or "Saved" indicator. */
export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'retrying' | 'failed';

export type SaveRunnerInput<T> = {
  build: () => T;
  save: (payload: T) => unknown;
  policy: RetryPolicy;
};

export type SaveRunnerOutput = {
  setStatus: (status: AutosaveStatus) => void;
  setError: (error: unknown) => void;
};

export type SaveRunner<T> = {
  /** Replaces what the next save reads. A save already running keeps the policy it started with. */
  configure: (input: SaveRunnerInput<T>) => void;
  mount: () => void;
  markDirty: () => void;
  /** Starts the debounce when something is dirty, and returns the way to cancel it. */
  schedule: (debounceMs: number) => (() => void) | undefined;
  /** Saves what is dirty now, then stops everything: used when the owner goes away. */
  dispose: () => void;
  retry: () => void;
  flush: () => void;
};

type SaveFailure = { error: unknown } | null;

/**
 * The save state machine behind `useAutosave`, free of React: one save in flight, a dirty flag that
 * asks for one follow-up save with the newest payload, and exponential backoff on failure.
 */
export function createSaveRunner<T>(
  { setStatus, setError }: SaveRunnerOutput,
  initial: SaveRunnerInput<T>,
): SaveRunner<T> {
  let latest = initial;
  let dirty = false;
  let inFlight = false;
  let disposed = false;
  let retries = 0;
  const debounce: TimerRef = { current: null };
  const backoff: TimerRef = { current: null };

  function run(): void {
    clearTimer(debounce);
    clearTimer(backoff);
    if (inFlight) return;
    inFlight = true;
    dirty = false;
    if (!disposed) setStatus('saving');
    const { build, save, policy } = latest;
    void attemptSave(() => save(build())).then((failure) => settle(failure, policy));
  }

  function settle(failure: SaveFailure, policy: RetryPolicy): void {
    inFlight = false;
    if (disposed) {
      if (dirty) run();
      return;
    }
    if (!failure) {
      retries = 0;
      setError(null);
      if (dirty) run();
      else setStatus('saved');
      return;
    }
    dirty = true;
    setError(failure.error);
    const delay = nextRetryDelay(failure.error, retries, policy);
    if (delay === null) {
      setStatus('failed');
      return;
    }
    retries += 1;
    setStatus('retrying');
    backoff.current = setTimeout(run, delay);
  }

  function retry(): void {
    retries = 0;
    run();
  }

  return {
    configure: (input) => {
      latest = input;
    },
    mount: () => {
      disposed = false;
    },
    markDirty: () => {
      dirty = true;
    },
    schedule: (debounceMs) => {
      if (!dirty) return undefined;
      clearTimer(debounce);
      debounce.current = setTimeout(run, debounceMs);
      return () => clearTimer(debounce);
    },
    dispose: () => {
      disposed = true;
      clearTimer(debounce);
      clearTimer(backoff);
      if (dirty) run();
    },
    retry,
    flush: () => {
      if (dirty) retry();
    },
  };
}
