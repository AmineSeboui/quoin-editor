import * as Y from 'yjs';
import type { Pos, Selection } from '../engine/model/types';
import { offsetIn, pointOf, regionOf, spanStart, type Layout } from './layout';
import { segAt } from './text-steps';

export type HeldSelection = { anchor: Y.RelativePosition; head: Y.RelativePosition } | null;

type Place = { index: number; beforeText: boolean };

function placeOf(layout: Layout, pos: Pos): Place {
  const { seg, rel } = pointOf(regionOf(layout, pos.block, pos.region), pos.offset);
  return { index: spanStart(layout, seg.host) + rel, beforeText: rel < seg.at + seg.length };
}

export function relative(text: Y.Text, layout: Layout, pos: Pos): Y.RelativePosition {
  return Y.createRelativePositionFromTypeIndex(text, placeOf(layout, pos).index, -1);
}

export function absolute(text: Y.Text, layout: Layout, held: Y.RelativePosition): Pos | null {
  const found = Y.createAbsolutePositionFromRelativePosition(held, text.doc!);
  if (found === null || found.type !== text) return null;
  const at = segAt(layout, found.index, false);
  if (at === null) return null;
  const { seg, rel } = at;
  return { block: seg.region.entry.id, region: seg.region.name, offset: offsetIn(seg, rel) };
}

/**
 * A text selection held by the characters next to its ends, so it can be put back where those characters are after
 * a change that moves them to another block: a caret and the end of a range by the character before, and the start of
 * a range by its first character where it has one, so that text put in at either end stays outside the range.
 */
export function holdSelection(text: Y.Text, layout: Layout, selection: Selection | null): HeldSelection {
  if (selection?.kind !== 'text') return null;
  try {
    const [anchor, head] = [placeOf(layout, selection.anchor), placeOf(layout, selection.head)];
    const hold = (place: Place, other: Place) =>
      Y.createRelativePositionFromTypeIndex(text, place.index, place.index < other.index && place.beforeText ? 0 : -1);
    return { anchor: hold(anchor, head), head: hold(head, anchor) };
  } catch {
    return null;
  }
}

export function restoreSelection(text: Y.Text, layout: Layout, held: HeldSelection | undefined): Selection | null {
  if (!held) return null;
  const [anchor, head] = [absolute(text, layout, held.anchor), absolute(text, layout, held.head)];
  return anchor === null || head === null ? null : { kind: 'text', anchor, head };
}
