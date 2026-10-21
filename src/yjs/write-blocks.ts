import type { EngineBlock } from '../engine/model/types';
import { deleteText, writeBlocks } from './doc-shape';
import { cleanEntry, indexOf, placeEntries, spanStart, textLength, type Entry, type Span } from './layout';
import { reread, type Shared } from './shared';

/** Writes `blocks` before the block `next`, or at the end when it is null. */
export function insertBlocks(shared: Shared, next: string | null, blocks: readonly EngineBlock[]): void {
  const { layout, text } = shared;
  const span = next === null ? null : layout.entries.get(next)!.span;
  const maps = writeBlocks(text, span === null ? textLength(layout) : spanStart(layout, span), blocks);
  const added = blocks.map((block, i) => cleanEntry(block, maps[i]));
  if (!layout.clean) reread(shared);
  else placeEntries(layout, span === null ? layout.spans.length : indexOf(layout, span), 0, added);
}

// The parts of a span that are not another block's characters.
function ownParts(entry: Entry, span: Span): [number, number][] {
  const parts: [number, number][] = [];
  let at = 0;
  const foreign = span.segs.filter((seg) => seg.region.entry !== entry).sort((a, b) => a.at - b.at);
  for (const seg of foreign) {
    if (seg.at > at) parts.push([at, seg.at - at]);
    at = seg.at + seg.length;
  }
  if (span.length > at) parts.push([at, span.length - at]);
  return parts;
}

/** Takes the block `id` out of the text, with every copy of it and every character the text gives it. */
export function removeBlock(shared: Shared, id: string): void {
  const { layout, text } = shared;
  const entry = layout.entries.get(id)!;
  if (layout.clean) {
    const index = indexOf(layout, entry.span);
    deleteText(text, spanStart(layout, entry.span), entry.span.length);
    placeEntries(layout, index, 1, []);
    return;
  }
  const ranges: [number, number][] = [];
  for (const span of [entry.span, ...entry.copies]) {
    const start = spanStart(layout, span);
    ranges.push(...ownParts(entry, span).map(([at, length]): [number, number] => [start + at, length]));
  }
  for (const seg of entry.regions.flatMap((region) => region.segs)) {
    if (seg.host !== entry.span) ranges.push([spanStart(layout, seg.host) + seg.at, seg.length]);
  }
  for (const [at, length] of ranges.sort((a, b) => b[0] - a[0])) if (length > 0) deleteText(text, at, length);
  reread(shared);
}
