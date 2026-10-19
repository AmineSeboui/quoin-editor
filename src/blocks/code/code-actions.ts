import { nodeSelection, setAttrsStep, setBlockType, type Command } from '../../engine';
import { runCommands } from '../../engine/commands/run-commands';
import { setSelection } from '../../engine/commands/selection-commands';
import { blockById } from '../../engine/model/doc';
import { HISTORY_GROUP } from '../../engine/state/history';
import type { ViewController } from '../../view';
import { moveToNeighbour } from '../../view/navigation/neighbour-block';

/** Writes the code of a block as one change of the history group named, so that a session of typing undoes at once. */
export function writeCode(controller: ViewController, blockId: string, code: string, group: string): void {
  const { editor } = controller;
  const block = blockById(editor.state.doc, blockId);
  if (block === undefined || block.attrs.code === code) return;
  controller.dispatch(editor.createTransaction().step(setAttrsStep(blockId, { code })).setMeta(HISTORY_GROUP, group));
}

export function codeToParagraph(blockId: string): Command {
  return (state, dispatch) => {
    const turn = setBlockType('MARKDOWN', { kind: 'paragraph' });
    const { ok, tr } = runCommands(state, [setSelection(nodeSelection(blockId)), turn]);
    if (ok && tr !== null) dispatch?.(tr);
    return ok;
  };
}

/** Moves the caret, and focus, from the code to the block before or after it. False where there is no such block. */
export function leaveCode(controller: ViewController, blockId: string, direction: -1 | 1): boolean {
  if (!moveToNeighbour(controller, blockId, direction)) return false;
  controller.focus();
  return true;
}
