import { nodeLength } from '../model/inline';
import { sameMark } from '../model/marks';
import type { Inline } from '../model/types';

export function markExtent(inline: Inline, offset: number, type: string): { from: number; to: number } | null {
  const starts: number[] = [];
  let position = 0;
  for (const node of inline) {
    starts.push(position);
    position += nodeLength(node);
  }
  const containing = (at: number) =>
    inline.findIndex((node, i) => starts[i] <= at && at < starts[i] + nodeLength(node));
  const markOf = (index: number) => inline[index]?.marks.find((mark) => mark.type === type);

  let seed = containing(offset);
  let mark = markOf(seed);
  if (mark === undefined) {
    seed = containing(offset - 1);
    mark = markOf(seed);
  }
  if (mark === undefined) return null;

  const shares = (index: number) => inline[index].marks.some((other) => sameMark(other, mark));
  let first = seed;
  while (first > 0 && shares(first - 1)) first--;
  let last = seed;
  while (last < inline.length - 1 && shares(last + 1)) last++;
  return { from: starts[first], to: starts[last] + nodeLength(inline[last]) };
}
