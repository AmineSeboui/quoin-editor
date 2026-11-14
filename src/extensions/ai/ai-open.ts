import type { EditorState } from '../../engine';
import type { ViewController } from '../../view';
import { openMenu } from './ai-flow';
import { targetOfBlocks, targetOfSelection } from './ai-target';

/** Opens the AI menu about the selected text or the block the caret is in, saying whether there was one. */
export function openForSelection(controller: ViewController): boolean {
  const target = targetOfSelection(controller.editor.state);
  if (target !== null) openMenu(controller.editor, target, false);
  return target !== null;
}

/** Opens the AI menu about the blocks, saying whether they hold text it can be about. */
export function openForBlocks(controller: ViewController, blockIds: readonly string[]): boolean {
  const target = targetOfBlocks(controller.editor.state, blockIds);
  if (target !== null) openMenu(controller.editor, target, false);
  return target !== null;
}

export const blocksHaveTarget = (state: EditorState, blockIds: readonly string[]): boolean =>
  targetOfBlocks(state, blockIds) !== null;
