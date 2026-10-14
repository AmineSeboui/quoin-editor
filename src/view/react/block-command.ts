import { blockRangeSelection, type Command } from '../../engine';
import { runCommands } from '../../engine/commands/run-commands';
import { setSelection } from '../../engine/commands/selection-commands';

// Runs a selection-based command on one block, then puts the selection back where it was: a control inside a block
// acts on that block without moving the caret the writer is typing at.
export function onBlock(id: string, command: Command): Command {
  return (state, dispatch) => {
    const { ok, tr } = runCommands(state, [setSelection(blockRangeSelection(id)), command]);
    if (!ok || tr === null) return false;
    dispatch?.(tr.setSelection(state.selection));
    return true;
  };
}
