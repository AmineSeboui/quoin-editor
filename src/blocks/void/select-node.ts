import { nodeSelection } from '../../engine';
import type { ViewController } from '../../view';
import { dispatchSelection } from '../../view/controller/dispatch-selection';

export function selectNode(controller: ViewController, blockId: string): void {
  const { editor } = controller;
  const { selection } = editor.state;
  if (selection?.kind === 'node' && selection.block === blockId) return;
  dispatchSelection(controller, nodeSelection(blockId));
}

/** Selects the block as a whole and hands focus to the editor, where the sink holding the selection takes it. */
export function focusNode(controller: ViewController, blockId: string): void {
  selectNode(controller, blockId);
  controller.focus();
}
