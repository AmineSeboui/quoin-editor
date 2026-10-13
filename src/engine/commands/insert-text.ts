import { indexOfBlock } from '../model/doc';
import { text } from '../model/inline';
import { newId } from '../model/new-id';
import { orderedRange } from '../model/position';
import { endOf, selectedBlockIds, textSelection } from '../state/selection';
import { Transaction, type TransactionOrigin } from '../state/transaction';
import { insertBlocksStep, removeBlocksStep } from '../transform/block-steps';
import type { Schema } from '../schema/types';
import { createBlock, withContent } from './block-helpers';
import type { Command } from './command';
import { deleteRange } from './delete-range';
import { insertTextAt } from './insert-text-at';

type Options = { origin?: TransactionOrigin; newId?: () => string };

function replaceBlocksWithText(
  tr: Transaction,
  schema: Schema,
  ids: readonly string[],
  value: string,
  makeId: () => string,
): void {
  const { doc } = tr;
  const index = ids.length > 0 ? indexOfBlock(doc, ids[0]) : doc.blocks.length;
  const indent = ids.length > 0 ? doc.blocks[index].indent : 0;
  if (ids.length > 0) tr.step(removeBlocksStep(index, ids.length));
  const empty = createBlock(schema, schema.defaultTextBlock, {}, indent, makeId());
  const paragraph = withContent(schema, empty, [text(value)]);
  tr.step(insertBlocksStep(index, [paragraph]));
  tr.setSelection(endOf(tr.doc, schema, paragraph.id));
}

export function insertText(value: string, options: Options = {}): Command {
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
      replaceBlocksWithText(tr, schema, selectedBlockIds(doc, selection), value, makeId);
    }
    dispatch?.(tr);
    return true;
  };
}
