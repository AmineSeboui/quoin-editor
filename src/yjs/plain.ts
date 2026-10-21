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
 * Whether blocks with regions put in before the span at `index` would come between characters outside any region and
 * the region they are read into, which would read them into the new blocks instead.
 */
export function crossesStray(layout: Layout, index: number): boolean {
  return layout.strays.some((seg) => {
    const [host, region] = [indexOf(layout, seg.host), indexOf(layout, seg.region.entry.span)];
    return region < index ? host >= index : host < index;
  });
}
