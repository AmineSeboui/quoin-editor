export type TimerRef = { current: ReturnType<typeof setTimeout> | null };

export function clearTimer(ref: TimerRef) {
  if (ref.current !== null) clearTimeout(ref.current);
  ref.current = null;
}

export const alwaysRetry = () => true;

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

/** Runs one save and returns its failure, or null when it succeeded. */
export async function attemptSave(run: () => unknown): Promise<{ error: unknown } | null> {
  try {
    const result = await run();
    return reportedFailure(result) ? { error: result } : null;
  } catch (error) {
    return { error };
  }
}

export type RetryPolicy = {
  debounceMs: number;
  maxBackoffMs: number;
  maxRetries: number;
  isRetryable: (error: unknown) => boolean;
};

/** The wait before the next retry, or null when the failure is final. */
export function nextRetryDelay(
  error: unknown,
  retriesSoFar: number,
  { debounceMs, maxBackoffMs, maxRetries, isRetryable }: RetryPolicy,
): number | null {
  if (retriesSoFar >= maxRetries || !isRetryable(error)) return null;
  return Math.min(debounceMs * 2 ** (retriesSoFar + 1), maxBackoffMs);
}
