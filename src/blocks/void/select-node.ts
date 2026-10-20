import { nodeSelection } from '../../engine';
import type { ViewController } from '../../view';

export function selectNode(controller: ViewController, blockId: string): void {
  const { editor } = controller;
  const { selection } = editor.state;
  if (selection?.kind === 'node' && selection.block === blockId) return;
  controller.dispatch(editor.createTransaction().setSelection(nodeSelection(blockId)));
}
