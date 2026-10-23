import { blockRangeSelection, Transaction, type Command, type Selection } from '../engine';
import { headBlockId } from '../engine/commands/block-helpers';
import { runCommands } from '../engine/commands/run-commands';
import { setSelection } from '../engine/commands/selection-commands';
import { sameItems } from '../engine/model/same-items';
import { endOf, sameSelection, selectedBlockIds, validateSelection } from '../engine/state/selection';
import type { ViewController } from '../view';

// The command ran on a range of the blocks the writer did not have selected. The caret goes back where it was when it
// is still inside one of them, and otherwise to the end of the first, so focus lands on the block the menu was for.
function settle(tr: Transaction, before: Selection | null): Selection | null {
  const { doc } = tr;
  const { schema } = tr.before;
  const result = tr.selection;
  if (result?.kind !== 'blocks' || before?.kind === 'blocks') return result;
  const ids = selectedBlockIds(doc, result);
  const head = headBlockId(before);
  if (head !== null && ids.includes(head) && validateSelection(doc, schema, before) === before) return before;
  return endOf(doc, schema, ids[0]);
}

// A command that changes nothing still moves the selection to the blocks, so every menu action returns focus there.
export function runOnBlocks(controller: ViewController, blockIds: readonly string[], command: Command): boolean {
  const { state } = controller.editor;
  const ids = blockIds.filter((id) => state.doc.index.has(id));
  if (ids.length === 0) return false;
  const before = state.selection;
  const exact = sameItems(selectedBlockIds(state.doc, before), ids);
  const ran = exact ? before : blockRangeSelection(ids[0], ids[ids.length - 1]);
  const { ok, tr } = runCommands(state, [setSelection(ran), command]);
  const result = ok && tr !== null ? tr : new Transaction(state).setSelection(ran);
  const settled = exact ? result.selection : settle(result, before);
  if (!sameSelection(settled, result.selection)) result.setSelection(settled);
  if (result.docChanged || !sameSelection(result.selection, before)) controller.dispatch(result);
  return ok;
}

export const noChange: Command = () => true;
