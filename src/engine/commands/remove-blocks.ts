import type { Schema } from '../schema/types';
import { endOf, startOf } from '../state/selection';
import type { Transaction } from '../state/transaction';
import { removeBlocksStep } from '../transform/block-steps';
import { capIndents } from './cap-indents';

export function removeBlocks(tr: Transaction, schema: Schema, index: number, count: number): void {
  const before = tr.doc.blocks[index - 1];
  const after = tr.doc.blocks[index + count];
  tr.step(removeBlocksStep(index, count));
  capIndents(tr, index);
  if (before !== undefined) tr.setSelection(endOf(tr.doc, schema, before.id));
  else tr.setSelection(after === undefined ? null : startOf(tr.doc, schema, after.id));
}
