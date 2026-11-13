/** What a failed upload is reported as: the host's own `Error` when it has a message to show, and `failed` otherwise. */
export const uploadError = (cause: unknown, failed: string): Error =>
  cause instanceof Error && cause.message ? cause : new Error(failed);
