import { caretMarks } from '../commands/caret-marks';
import { inlineText, sliceInline } from '../model/inline';
import { removeMark } from '../model/marks';
import type { Mark } from '../model/types';
import { textSelection } from '../state/selection';
import { Transaction } from '../state/transaction';
import { addMarkStep } from '../transform/mark-steps';
import { replaceInlineStep } from '../transform/replace-inline-step';
import type { InputRule } from './input-rule';
import { regionInline } from './region-inline';
import { touchesMark } from './touches-mark';

type MarkRuleSpec = {
  readonly name: string;
  // Group 1 holds the content between the delimiters. The match ends with the closing delimiter.
  readonly match: RegExp;
  readonly open: number;
  readonly close?: (match: RegExpExecArray) => number;
  readonly wordBounded?: boolean;
  mark(match: RegExpExecArray): Mark | null;
};

const WORD_CHARACTER = /[\p{L}\p{N}]/u;

export function markRule({ name, match, open, close, wordBounded = false, mark }: MarkRuleSpec): InputRule {
  return {
    name,
    match,
    handler(state, found, range) {
      const added = mark(found);
      if (added === null) return null;
      const { block, region, to } = range;
      const inline = regionInline(state, range);
      const contentTo = to - (close?.(found) ?? open);
      const contentFrom = contentTo - found[1].length;
      const from = contentFrom - open;
      if (wordBounded && WORD_CHARACTER.test(inlineText(sliceInline(inline, to, to + 1)))) return null;
      if (touchesMark(inline, from, contentFrom, 'code') || touchesMark(inline, contentTo, to, 'code')) return null;

      const tr = new Transaction(state);
      tr.step(addMarkStep(block, region, contentFrom, contentTo, added));
      tr.step(replaceInlineStep(block, region, contentTo, to, []));
      tr.step(replaceInlineStep(block, region, from, contentFrom, []));
      const caret = { block, region, offset: from + found[1].length };
      const carried = caretMarks(tr.doc, state.schema, null, caret);
      return tr.setSelection(textSelection(caret)).setStoredMarks(removeMark(carried, added.type));
    },
  };
}
