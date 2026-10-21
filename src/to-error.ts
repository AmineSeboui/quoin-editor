/** What was thrown or rejected, as an Error, for a host's `onError`. */
export const toError = (cause: unknown): Error => (cause instanceof Error ? cause : new Error(String(cause)));
