import { blockById } from '../model/doc';
import { nextGraphemeOffset, prevGraphemeOffset } from '../model/graphemes';
import { inlineText, sliceInline } from '../model/inline';
import { isCollapsed, textSelection } from '../state/selection';
import { Transaction } from '../state/transaction';
import { replaceInlineStep } from '../transform/replace-inline-step';
import type { Command } from './command';

const LINE_BREAK = '\n';

// At the end of a line there is nothing after the caret, so the two graphemes before it swap instead.
export const transposeChars: Command = (state, dispatch) => {
  const { selection } = state;
  if (selection?.kind !== 'text' || !isCollapsed(selection)) return false;
  const { head } = selection;
  const inline = blockById(state.doc, head.block)?.regions[head.region];
  if (inline === undefined) return false;
  const value = inlineText(inline);
  const atLineEnd = head.offset === value.length || value[head.offset] === LINE_BREAK;
  const end = atLineEnd ? head.offset : nextGraphemeOffset(value, head.offset);
  const middle = prevGraphemeOffset(value, end);
  const start = prevGraphemeOffset(value, middle);
  if (start === middle || value.slice(start, end).includes(LINE_BREAK)) return false;
  const swapped = [...sliceInline(inline, middle, end), ...sliceInline(inline, start, middle)];
  const tr = new Transaction(state).setOrigin('input');
  tr.step(replaceInlineStep(head.block, head.region, start, end, swapped));
  dispatch?.(tr.setSelection(textSelection({ ...head, offset: end })));
  return true;
};
