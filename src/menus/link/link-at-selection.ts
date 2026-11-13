import type { EditorState, Pos } from '../../engine';
import { markExtent } from '../../engine/commands/mark-extent';
import type { MarkRange } from '../../engine/commands/selection-marks';
import { sliceInline } from '../../engine/model/inline';
import { orderedRange } from '../../engine/model/position';
import { regionInline } from '../../view/controller/region-inline';

export type LinkAtSelection = { href: string; title?: string; range: MarkRange };

/**
 * The link that holds the text from `from` to `to` of one region whole, found as `setLink` and `unsetLink` find the
 * link at a caret: a caret at either edge of a link is in it.
 */
export function linkAround(state: EditorState, from: Pos, to: Pos = from): LinkAtSelection | null {
  if (from.block !== to.block || from.region !== to.region) return null;
  const inline = regionInline(state, from.block, from.region) ?? [];
  const extent = markExtent(inline, from.offset, 'link');
  if (extent === null || to.offset > extent.to) return null;
  const attrs = sliceInline(inline, extent.from, extent.to)[0]?.marks.find((mark) => mark.type === 'link')?.attrs;
  if (attrs?.href === undefined) return null;
  const range = { block: from.block, region: from.region, ...extent };
  return { href: attrs.href, title: attrs.title || undefined, range };
}

export function linkAtSelection(state: EditorState): LinkAtSelection | null {
  const { selection } = state;
  if (selection?.kind !== 'text') return null;
  const { from, to } = orderedRange(state.doc, selection.anchor, selection.head);
  return linkAround(state, from, to);
}

/** Whether two answers name the same link over the same text, so a card drawn for one stays put for the other. */
export function sameLink(a: LinkAtSelection | null, b: LinkAtSelection | null): boolean {
  if (a === null || b === null) return a === b;
  const [x, y] = [a.range, b.range];
  const sameRange = x.block === y.block && x.region === y.region && x.from === y.from && x.to === y.to;
  return sameRange && a.href === b.href && a.title === b.title;
}
