import { textSelection, type EditorState, type Transaction } from '../../engine';
import { markRanges } from '../../engine/commands/selection-marks';
import { comparePos } from '../../engine/model/position';
import type { AnchorRange } from './comment-anchors';

/**
 * The parts of a pending anchor after an edit: its ends mapped, what is typed at either edge left outside as it is for
 * the comment mark it becomes, and the text between them taken block by block, so a split keeps both halves.
 */
export function mapPendingRanges(tr: Transaction, ranges: readonly AnchorRange[], state: EditorState): AnchorRange[] {
  return ranges.flatMap((range) => {
    const from = tr.mapPos({ block: range.block, region: range.region, offset: range.from }, 1);
    const to = tr.mapPos({ block: range.block, region: range.region, offset: range.to }, -1);
    const { index } = state.doc;
    if (!index.has(from.block) || !index.has(to.block) || comparePos(state.doc, from, to) >= 0) return [];
    return markRanges({ ...state, selection: textSelection(from, to) });
  });
}
