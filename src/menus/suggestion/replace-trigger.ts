import { replaceInlineStep, textSelection, Transaction, type Command } from '../../engine';
import { runCommands } from '../../engine/commands/run-commands';
import type { SuggestionRange } from '../../extensions/ui-types';
import type { ViewController } from '../../view';

function deleteTrigger({ block, region, from, to }: SuggestionRange): Command {
  return (state, dispatch) => {
    const tr = new Transaction(state);
    if (from >= to || !tr.maybeStep(replaceInlineStep(block, region, from, to, []))) return false;
    dispatch?.(tr.setSelection(textSelection({ block, region, offset: from })));
    return true;
  };
}

/**
 * Removes the trigger character and the query, then runs `command` from the caret left where they were, as one
 * transaction, so a single undo brings the query back. Returns whether anything ran.
 */
export function replaceTrigger(controller: ViewController, range: SuggestionRange, command?: Command): boolean {
  const commands = command === undefined ? [deleteTrigger(range)] : [deleteTrigger(range), command];
  const { ok, tr } = runCommands(controller.editor.state, commands);
  if (ok && tr !== null) controller.dispatch(tr);
  return ok;
}
