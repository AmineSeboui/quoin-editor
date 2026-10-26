import type * as Y from 'yjs';
import { inlineLength } from '../engine/model/inline';
import type { Inline } from '../engine/model/types';
import { deleteText, regionStart } from './doc-shape';
import { insertInline } from './inline-codec';
import { grow, piecesOf, pointOf, spanStart, type Layout, type Region } from './layout';
import { readShared } from './read-shared';
import type { RequiredRegions } from './required-regions';

/**
 * A shared text, where it holds each block, and the regions each block type needs. `stale` says a change was written
 * over a layout that was not clean, so the text may now read as a document other than the editor's.
 */
export type Shared = {
  readonly text: Y.Text;
  layout: Layout;
  stale: boolean;
  readonly required: RequiredRegions;
  readonly onError: (error: Error) => void;
};

export function reread(shared: Shared): void {
  shared.layout = readShared(shared.text, shared.required).layout;
  shared.stale = true;
}

export function insertContent(shared: Shared, region: Region, offset: number, inline: Inline): void {
  if (inline.length === 0) return;
  if (region.segs.length === 0) return openRegion(shared, region, inline);
  const { seg, rel } = pointOf(region, offset);
  insertInline(shared.text, spanStart(shared.layout, seg.host) + rel, inline);
  grow(shared.layout, seg, rel, inlineLength(inline));
}

export function deleteContent(shared: Shared, region: Region, from: number, to: number): void {
  for (const { seg, rel, length } of piecesOf(region, from, to).reverse()) {
    deleteText(shared.text, spanStart(shared.layout, seg.host) + rel, length);
    grow(shared.layout, seg, rel, -length);
  }
}

export function formatContent(
  shared: Shared,
  region: Region,
  from: number,
  to: number,
  attributes: Record<string, unknown>,
): void {
  for (const { seg, rel, length } of piecesOf(region, from, to)) {
    shared.text.format(spanStart(shared.layout, seg.host) + rel, length, attributes);
  }
}

// A region the text does not hold, read as empty, is written at the end of its block's span, where whatever stands
// before it is read as before.
function openRegion(shared: Shared, { name, entry }: Region, inline: Inline): void {
  const at = spanStart(shared.layout, entry.span) + entry.span.length;
  shared.text.insertEmbed(at, regionStart(name), {});
  insertInline(shared.text, at + 1, inline);
  reread(shared);
}
