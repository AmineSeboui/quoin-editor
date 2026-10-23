export type RailItem = { readonly top: number | null; readonly height: number };

/**
 * Where each thread goes beside the document: level with its block where there is room, else just below the thread
 * before it. A thread with no top, whose text is gone, follows the one before it.
 */
export function stackTops(items: readonly RailItem[], gap: number): number[] {
  let next = 0;
  return items.map(({ top, height }) => {
    const placed = Math.max(top ?? next, next);
    next = placed + height + gap;
    return placed;
  });
}
