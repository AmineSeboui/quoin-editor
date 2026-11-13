import { blockRangeSelection, type Command } from '../engine';
import { createBlock, descendantsEnd, isParagraph, regionLength } from '../engine/commands/block-helpers';
import { insertText } from '../engine/commands/insert-text';
import { runCommands } from '../engine/commands/run-commands';
import { setSelection } from '../engine/commands/selection-commands';
import { requireBlockIndex } from '../engine/model/doc';
import { primaryRegion, startOf } from '../engine/state/selection';
import { Transaction } from '../engine/state/transaction';
import { insertBlocksStep } from '../engine/transform/block-steps';
import type { ViewController } from '../view';

// After the nested blocks too, at the block's own depth, so the new line is the block's next sibling.
const paragraphAfter =
  (blockId: string): Command =>
  (state, dispatch) => {
    const { doc, schema } = state;
    const index = requireBlockIndex(doc, blockId);
    const paragraph = createBlock(schema, 'MARKDOWN', { kind: 'paragraph' }, doc.blocks[index].indent);
    const tr = new Transaction(state).step(insertBlocksStep(descendantsEnd(doc, index), [paragraph]));
    dispatch?.(tr.setSelection(startOf(tr.doc, schema, paragraph.id)));
    return true;
  };

/**
 * Puts a paragraph below the block and its nested blocks, or takes the block when it is an empty paragraph with none,
 * and opens the slash menu in it.
 */
export function addBlockBelow(controller: ViewController, blockId: string): boolean {
  const { state } = controller.editor;
  const { doc, schema } = state;
  const index = doc.index.get(blockId);
  if (index === undefined) return false;
  const block = doc.blocks[index];
  const alone = descendantsEnd(doc, index) === index + 1;
  const empty = alone && isParagraph(block) && regionLength(block, primaryRegion(schema, block) ?? '') === 0;
  const fill = empty ? setSelection(startOf(doc, schema, blockId)) : paragraphAfter(blockId);
  const slash = insertText('/', { origin: 'command' });
  const { ok, tr } = runCommands(state, [setSelection(blockRangeSelection(blockId)), fill, slash]);
  if (ok && tr !== null) controller.dispatch(tr);
  controller.focus();
  return ok;
}
