import type { EngineBlock } from '../engine/model/types';
import { deleteText, writeBlocks } from './doc-shape';
import { cleanEntry, indexOf, placeEntries, spanStart, textLength, type Entry, type Layout, type Span } from './layout';
import { crossesStray, isPlain } from './plain';
import { reread, type Shared } from './shared';

/** Writes `blocks` before the block `next`, or at the end when it is null. */
export function insertBlocks(shared: Shared, next: string | null, blocks: readonly EngineBlock[]): void {
  const { layout, text } = shared;
  const span = next === null ? null : layout.entries.get(next)!.span;
  const index = span === null ? layout.spans.length : indexOf(layout, span);
  const crosses = blocks.some((block) => Object.keys(block.regions).length > 0) && crossesStray(layout, index);
  const maps = writeBlocks(text, span === null ? textLength(layout) : spanStart(layout, span), blocks);
  if (crosses) reread(shared);
  else placeEntries(layout, index, 0, blocks.map((block, i) => cleanEntry(block, maps[i])));
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

/** Takes whole spans out of the text, last first. */
export function dropSpans(shared: Shared, spans: readonly Span[]): void {
  const { layout, text } = shared;
  for (const span of [...spans].sort((a, b) => indexOf(layout, b) - indexOf(layout, a))) {
    const at = indexOf(layout, span);
    deleteText(text, spanStart(layout, span), span.length);
    placeEntries(layout, at, 1, []);
  }
}

/** The stretches nobody reads right before `span`, which would swallow what anyone types into it meanwhile. */
export function unreadBefore(layout: Layout, span: Span): Span[] {
  const before: Span[] = [];
  for (let at = indexOf(layout, span) - 1; at > 0 && layout.spans[at].entry === null; at--) {
    before.push(layout.spans[at]);
  }
  return before;
}

/**
 * Takes the block `id` out of the text, with every copy of it, every character the text gives it, and the stretches
 * nobody reads right before it.
 */
export function removeBlock(shared: Shared, id: string): void {
  const { layout, text } = shared;
  const entry = layout.entries.get(id)!;
  const unread = [...entry.copies, ...unreadBefore(layout, entry.span)];
  if (isPlain(entry)) return dropSpans(shared, [...new Set([entry.span, ...unread])]);
  dropSpans(shared, [...new Set(unread)]);
  const ranges: [number, number][] = [];
  const start = spanStart(layout, entry.span);
  ranges.push(...ownParts(entry, entry.span).map(([at, length]): [number, number] => [start + at, length]));
  for (const seg of entry.regions.flatMap((region) => region.segs)) {
    if (seg.host !== entry.span) ranges.push([spanStart(layout, seg.host) + seg.at, seg.length]);
  }
  for (const [at, length] of ranges.sort((a, b) => b[0] - a[0])) if (length > 0) deleteText(text, at, length);
  reread(shared);
}
