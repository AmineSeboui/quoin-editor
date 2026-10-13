import { text } from '../model/inline';
import type { Pos } from '../model/types';
import type { Schema } from '../schema/types';
import type { Transaction } from '../state/transaction';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { caretMarks } from './caret-marks';

export function insertTextAt(tr: Transaction, schema: Schema, pos: Pos, value: string): Pos {
  const slice = [text(value, caretMarks(tr.doc, schema, tr.storedMarks, pos))];
  tr.step(replaceInlineStep(pos.block, pos.region, pos.offset, pos.offset, slice));
  return { ...pos, offset: pos.offset + value.length };
}
