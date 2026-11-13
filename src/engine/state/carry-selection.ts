import { comparePos } from '../model/position';
import type { EngineDoc, Selection } from '../model/types';
import type { PosMap } from '../transform/step';
import { isBackward, isCollapsed, mapSelection, textSelection } from './selection';
import type { TransactionOrigin } from './transaction';

/**
 * The selection carried through a change from `before` to `after`. A change made elsewhere never draws in what it puts
 * in at the selection's ends: a caret stays before text put in at it, a split there included, and a range keeps text
 * put in at either of its ends outside it. An end whose block the change removes goes to the block after, as any
 * change takes it.
 */
export function carrySelection(
  selection: Selection,
  map: PosMap,
  before: EngineDoc,
  after: EngineDoc,
  origin: TransactionOrigin,
): Selection {
  if (origin !== 'remote' || selection.kind !== 'text') return mapSelection(selection, map, before);
  const { anchor, head } = selection;
  const backward = isBackward(before, selection);
  const [from, to] = backward ? [head, anchor] : [anchor, head];
  const end = map(to, after.index.has(to.block) ? -1 : 1);
  const mapped = isCollapsed(selection) ? end : map(from, 1);
  const inside = after.index.has(mapped.block) && after.index.has(end.block);
  const start = inside && comparePos(after, mapped, end) > 0 ? end : mapped;
  if (start === from && end === to) return selection;
  return backward ? textSelection(end, start) : textSelection(start, end);
}
