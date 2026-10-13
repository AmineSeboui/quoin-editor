import { createBlockCodec } from '../blocks/codec';
import type { Command } from '../commands/command';
import { selectedBlockRange } from '../commands/block-helpers';
import { deleteRange } from '../commands/delete-range';
import { newId } from '../model/new-id';
import { orderedRange } from '../model/position';
import type { EngineBlock, Selection } from '../model/types';
import type { Schema } from '../schema/types';
import { endOf } from '../state/selection';
import { Transaction } from '../state/transaction';
import { insertBlocksStep, removeBlocksStep } from '../transform/block-steps';
import { pasteAtCaret } from './paste-at-caret';
import type { Slice } from './slice';
import { freshBlocks } from './slice-blocks';

function replaceSelected(
  tr: Transaction,
  schema: Schema,
  selection: Selection,
  pieces: readonly EngineBlock[],
  makeId: () => string,
): void {
  const range = selectedBlockRange(tr.doc, selection);
  if (range === null) return;
  const fresh = freshBlocks(pieces, tr.doc.blocks[range.start].indent, makeId);
  tr.step(insertBlocksStep(range.end, fresh));
  tr.step(removeBlocksStep(range.start, range.end - range.start));
  tr.setSelection(endOf(tr.doc, schema, fresh[fresh.length - 1].id));
}

export function insertSlice(slice: Slice, options: { newId?: () => string } = {}): Command {
  const makeId = options.newId ?? newId;
  return (state, dispatch) => {
    const { doc, schema, selection } = state;
    if (selection === null) return false;
    const codec = createBlockCodec(schema, { newId: makeId });
    const pieces = slice.blocks.flatMap((block) => codec.toEngineBlocks(block));
    if (pieces.length === 0) return false;
    const tr = new Transaction(state).setOrigin('paste');
    if (selection.kind === 'text') {
      const { from, to } = orderedRange(doc, selection.anchor, selection.head);
      pasteAtCaret(tr, schema, deleteRange(tr, schema, from, to, makeId), slice, pieces, makeId);
    } else {
      replaceSelected(tr, schema, selection, pieces, makeId);
    }
    dispatch?.(tr);
    return true;
  };
}
