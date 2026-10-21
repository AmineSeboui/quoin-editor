import * as Y from 'yjs';
import type { Pos, Selection } from '../engine/model/types';
import { offsetIn, pointOf, regionOf, spanAt, spanStart, type Layout } from './layout';

export type HeldSelection = { anchor: Y.RelativePosition; head: Y.RelativePosition } | null;

export function relative(text: Y.Text, layout: Layout, pos: Pos): Y.RelativePosition {
  const { seg, rel } = pointOf(regionOf(layout, pos.block, pos.region), pos.offset);
  return Y.createRelativePositionFromTypeIndex(text, spanStart(layout, seg.host) + rel, -1);
}

export function absolute(text: Y.Text, layout: Layout, held: Y.RelativePosition): Pos | null {
  const found = Y.createAbsolutePositionFromRelativePosition(held, text.doc!);
  if (found === null || found.type !== text) return null;
  const span = spanAt(layout, found.index);
  const rel = found.index - spanStart(layout, span);
  const seg = span.segs.find((candidate) => candidate.at <= rel && rel <= candidate.at + candidate.length);
  return seg === undefined ? null : { block: seg.region.entry.id, region: seg.region.name, offset: offsetIn(seg, rel) };
}

/**
 * A text selection held by the characters before its ends, so it can be put back where those characters are after
 * a change that moves them to another block.
 */
export function holdSelection(text: Y.Text, layout: Layout, selection: Selection | null): HeldSelection {
  if (selection?.kind !== 'text') return null;
  try {
    return { anchor: relative(text, layout, selection.anchor), head: relative(text, layout, selection.head) };
  } catch {
    return null;
  }
}

export function restoreSelection(text: Y.Text, layout: Layout, held: HeldSelection): Selection | null {
  if (held === null) return null;
  const [anchor, head] = [absolute(text, layout, held.anchor), absolute(text, layout, held.head)];
  return anchor === null || head === null ? null : { kind: 'text', anchor, head };
}
