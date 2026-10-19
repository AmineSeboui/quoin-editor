import { text } from '../model/inline';
import { newId } from '../model/new-id';
import { orderedRange } from '../model/position';
import { endOf, textSelection } from '../state/selection';
import { Transaction, type TransactionOrigin } from '../state/transaction';
import { insertBlocksStep, removeBlocksStep } from '../transform/block-steps';
import type { Schema } from '../schema/types';
import { createBlock, selectedBlockRange, withContent, type BlockRange } from './block-helpers';
import type { Command } from './command';
import { deleteRange } from './delete-range';
import { insertTextAt } from './insert-text-at';

export type InsertTextOptions = { origin?: TransactionOrigin; newId?: () => string };

function replaceBlocksWithText(
  tr: Transaction,
  schema: Schema,
  range: BlockRange | null,
  value: string,
  makeId: () => string,
): void {
  const { doc } = tr;
  const index = range === null ? doc.blocks.length : range.start;
  const indent = range === null ? 0 : doc.blocks[index].indent;
  if (range !== null) tr.step(removeBlocksStep(index, range.end - range.start));
  const empty = createBlock(schema, schema.defaultTextBlock, {}, indent, makeId());
  const paragraph = withContent(schema, empty, [text(value)]);
  tr.step(insertBlocksStep(index, [paragraph]));
  tr.setSelection(endOf(tr.doc, schema, paragraph.id));
}

/**
 * Inserts `value` at the selection, in place of any selected text or blocks, as a command an extension can return. Undo
 * treats it as typing unless `options.origin` gives another origin.
 */
export function insertText(value: string, options: InsertTextOptions = {}): Command {
  const makeId = options.newId ?? newId;
  return (state, dispatch) => {
    if (value === '') return false;
    const { doc, schema, selection } = state;
    const tr = new Transaction(state).setOrigin(options.origin ?? 'input');
    if (selection?.kind === 'text') {
      const { from, to } = orderedRange(doc, selection.anchor, selection.head);
      const caret = deleteRange(tr, schema, from, to, makeId);
      tr.setSelection(textSelection(insertTextAt(tr, schema, caret, value)));
    } else {
      replaceBlocksWithText(tr, schema, selectedBlockRange(doc, selection), value, makeId);
    }
    dispatch?.(tr);
    return true;
  };
}
