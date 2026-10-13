import { requireBlockIndex } from '../model/doc';
import { newId } from '../model/new-id';
import { orderedRange } from '../model/position';
import { isCollapsed, startOf } from '../state/selection';
import { Transaction } from '../state/transaction';
import { insertBlocksStep } from '../transform/block-steps';
import { createBlock, descendantsEnd } from './block-helpers';
import type { Command } from './command';
import { deleteRange } from './delete-range';
import { splitAt } from './split-at';

export function splitBlock(options: { newId?: () => string } = {}): Command {
  const makeId = options.newId ?? newId;
  return (state, dispatch) => {
    const { doc, schema, selection } = state;
    if (selection === null || selection.kind === 'blocks') return false;
    const tr = new Transaction(state);
    if (selection.kind === 'node') {
      const index = requireBlockIndex(doc, selection.block);
      const paragraph = createBlock(schema, schema.defaultTextBlock, {}, doc.blocks[index].indent, makeId());
      tr.step(insertBlocksStep(descendantsEnd(doc, index), [paragraph]));
      tr.setSelection(startOf(tr.doc, schema, paragraph.id));
    } else {
      const { from, to } = orderedRange(doc, selection.anchor, selection.head);
      const caret = deleteRange(tr, schema, from, to, makeId);
      if (!splitAt(tr, schema, caret, isCollapsed(selection), makeId)) return false;
    }
    dispatch?.(tr);
    return true;
  };
}
