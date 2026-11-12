/** How the host's callbacks read a failed answer: the reason to show, and whether asking again could help. */
export type AiFailureOptions = {
  describeError?: (error: unknown) => string | undefined;
  isRetryable?: (error: unknown) => boolean;
};

/** What the bar shows of a failed answer: the host's reason, when it gave one, and whether it offers Retry. */
export type AiFailure = { readonly reason?: string; readonly retryable: boolean };

// The callbacks are the host's, so a throw from either leaves the bar as it is without them rather than replacing the
// stream's own failure, which still reaches onError.
function attempt<T>(call: () => T): T | undefined {
  try {
    return call();
  } catch {
    return undefined;
  }
}

export function failureOf(error: unknown, { describeError, isRetryable }: AiFailureOptions): AiFailure {
  const reason = describeError && attempt(() => describeError(error));
  const retryable = attempt(() => isRetryable?.(error)) !== false;
  return typeof reason === 'string' && reason.trim() !== '' ? { reason, retryable } : { retryable };
}
