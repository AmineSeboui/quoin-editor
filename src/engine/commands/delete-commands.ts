import { indexOfBlock, requireBlockIndex } from '../model/doc';
import { inlineText } from '../model/inline';
import { nextGraphemeOffset, nextWordOffset, prevGraphemeOffset, prevWordOffset } from '../model/graphemes';
import { orderedRange } from '../model/position';
import { isCollapsed, selectedBlockIds, textSelection } from '../state/selection';
import { Transaction } from '../state/transaction';
import { replaceInlineStep } from '../transform/replace-inline-step';
import type { Command } from './command';
import { deleteAtEnd, deleteAtStart } from './delete-at-boundary';
import { deleteRange } from './delete-range';
import { removeBlocks } from './remove-blocks';

type Reach = (text: string, offset: number) => number;

export const deleteSelection: Command = (state, dispatch) => {
  const { doc, schema, selection } = state;
  if (selection === null || isCollapsed(selection)) return false;
  const tr = new Transaction(state);
  if (selection.kind === 'text') {
    const { from, to } = orderedRange(doc, selection.anchor, selection.head);
    tr.setSelection(textSelection(deleteRange(tr, schema, from, to)));
  } else {
    const ids = selectedBlockIds(doc, selection);
    removeBlocks(tr, schema, indexOfBlock(doc, ids[0]), ids.length);
  }
  dispatch?.(tr);
  return true;
};

function deleteReaching(forward: boolean, reach: Reach): Command {
  return (state, dispatch) => {
    const { selection } = state;
    if (selection?.kind !== 'text' || !isCollapsed(selection)) return deleteSelection(state, dispatch);
    const { head } = selection;
    const value = inlineText(state.doc.blocks[requireBlockIndex(state.doc, head.block)].regions[head.region]);
    if (forward ? head.offset >= value.length : head.offset <= 0) {
      return (forward ? deleteAtEnd : deleteAtStart)(state, dispatch);
    }
    const other = reach(value, head.offset);
    const from = Math.min(head.offset, other);
    const to = Math.max(head.offset, other);
    const tr = new Transaction(state).step(replaceInlineStep(head.block, head.region, from, to, []));
    dispatch?.(tr.setSelection(textSelection({ ...head, offset: from })));
    return true;
  };
}

const lineStart: Reach = (value, offset) => {
  const start = value.lastIndexOf('\n', offset - 1) + 1;
  return start === offset ? offset - 1 : start;
};

const lineEnd: Reach = (value, offset) => {
  const found = value.indexOf('\n', offset);
  const end = found === -1 ? value.length : found;
  return end === offset ? offset + 1 : end;
};

export const deleteBackward = deleteReaching(false, prevGraphemeOffset);
export const deleteForward = deleteReaching(true, nextGraphemeOffset);
export const deleteWordBackward = deleteReaching(false, prevWordOffset);
export const deleteWordForward = deleteReaching(true, nextWordOffset);
export const deleteToLineStart = deleteReaching(false, lineStart);
export const deleteToLineEnd = deleteReaching(true, lineEnd);
