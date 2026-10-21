import type * as Y from 'yjs';
import type { EngineBlock } from '../engine/model/types';
import { cleanEntry, indexOf, type Entry, type Layout } from './layout';

/**
 * Whether the text holds the block exactly as it writes one: its marker, then each region's start and characters,
 * nothing else in its span and none of its characters elsewhere. Such a block can be split, joined, rewritten or taken
 * out by its own span whatever the rest of the text holds.
 */
export function isPlain({ span, regions }: Entry): boolean {
  if (span.segs.length !== regions.length) return false;
  let end = 1;
  for (const { segs } of regions) {
    if (segs.length !== 1 || segs[0].host !== span || segs[0].at !== end + 1) return false;
    end = segs[0].at + segs[0].length;
  }
  return span.length === end;
}

/** The entry of a block written out cleanly in place of `entry`, keeping its marker and the copies of its id. */
export function rewritten(entry: Entry, block: EngineBlock, map: Y.Map<unknown> = entry.map): Entry {
  const next = cleanEntry(block, map);
  next.copies.push(...entry.copies);
  for (const copy of next.copies) copy.copyOf = next;
  return next;
}

/**
 * Whether a region written where the span at `index` starts, as blocks put in before it or as the first region of the
 * block it holds, would come between characters outside any region and the region they are read into, or be the region
 * characters nobody read until then are read into.
 */
export function crossesStray(layout: Layout, index: number): boolean {
  const { read, leading, unread } = layout.strays;
  return (
    unread ||
    read.some((seg) => {
      const region = indexOf(layout, seg.region.entry.span);
      return leading.has(seg) ? index <= region : region < index && index <= indexOf(layout, seg.host);
    })
  );
}
