import type { PlacedItem } from '../text/line-layout';

export type Span<T> = { readonly x: number; readonly width: number; readonly value: T; readonly items: readonly PlacedItem[] };

/**
 * The runs of neighbouring items that share a value `pick` reads, such as a link or an underline, each from its first
 * item to the end of its last, leaving out the spaces the line ends with. Items with no value break a run.
 */
export function itemSpans<T>(items: readonly PlacedItem[], pick: (item: PlacedItem) => T | undefined, same: (a: T, b: T) => boolean): Span<T>[] {
  let end = items.length;
  while (end > 0 && items[end - 1].space) end--;
  const spans: { value: T; items: PlacedItem[] }[] = [];
  for (const item of items.slice(0, end)) {
    const value = pick(item);
    const last = spans[spans.length - 1];
    if (value === undefined) spans.push({ value: undefined as T, items: [] });
    else if (last && last.items.length > 0 && same(last.value, value)) last.items.push(item);
    else spans.push({ value, items: [item] });
  }
  return spans
    .filter(({ items: run }) => run.length > 0)
    .map(({ value, items: run }) => {
      const tail = run[run.length - 1];
      return { x: run[0].x, width: tail.x + tail.width - run[0].x, value, items: run };
    });
}
