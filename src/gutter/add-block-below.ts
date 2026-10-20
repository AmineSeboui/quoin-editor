import { blockRangeSelection, insertBlockAfter } from '../engine';
import { isParagraph, regionLength } from '../engine/commands/block-helpers';
import { insertText } from '../engine/commands/insert-text';
import { runCommands } from '../engine/commands/run-commands';
import { setSelection } from '../engine/commands/selection-commands';
import { blockById } from '../engine/model/doc';
import { primaryRegion, startOf } from '../engine/state/selection';
import type { ViewController } from '../view';

/** Puts a paragraph below the block, or takes the block when it is an empty paragraph, and opens the slash menu in it. */
export function addBlockBelow(controller: ViewController, blockId: string): boolean {
  const { state } = controller.editor;
  const { doc, schema } = state;
  const block = blockById(doc, blockId);
  if (block === undefined) return false;
  const empty = isParagraph(block) && regionLength(block, primaryRegion(schema, block) ?? '') === 0;
  const fill = empty ? setSelection(startOf(doc, schema, blockId)) : insertBlockAfter('MARKDOWN', { kind: 'paragraph' });
  const slash = insertText('/', { origin: 'command' });
  const { ok, tr } = runCommands(state, [setSelection(blockRangeSelection(blockId)), fill, slash]);
  if (ok && tr !== null) controller.dispatch(tr);
  controller.focus();
  return ok;
}
