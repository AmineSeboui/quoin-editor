export const MAX_MARKER_NUMBER = 999_999_999;

export function orderedStart(start: unknown): number {
  return typeof start === 'number' && Number.isInteger(start) && start >= 0 ? Math.min(start, MAX_MARKER_NUMBER) : 1;
}
