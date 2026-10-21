import type * as Y from 'yjs';
import { inlineLength } from '../engine/model/inline';
import type { Inline } from '../engine/model/types';
import { deleteText } from './doc-shape';
import { insertInline } from './inline-codec';
import { grow, piecesOf, pointOf, spanStart, type Layout, type Region } from './layout';
import { readShared } from './read-shared';

/**
 * A shared text and where it holds each block. `stale` says a change was written over a layout that was not clean, so
 * the text may now read as a document other than the editor's.
 */
export type Shared = { readonly text: Y.Text; layout: Layout; stale: boolean };

export function reread(shared: Shared): void {
  shared.layout = readShared(shared.text).layout;
  shared.stale = true;
}

export function insertContent(shared: Shared, region: Region, offset: number, inline: Inline): void {
  if (inline.length === 0) return;
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
