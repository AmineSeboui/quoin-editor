import type { Pos } from '../../engine';
import { textSelection } from '../../engine/state/selection';
import type { ViewController } from '../controller/view-controller';
import { entersAsNode } from '../navigation/node-entry';
import { caretPosAt, hostAt } from '../selection/pointer-targets';
import { pasteTransfer, transferFiles } from './paste-transfer';

const DROPPABLE = ['Files', 'text/plain', 'text/html'];

function dropPos(controller: ViewController, x: number, y: number): Pos | null {
  const host = hostAt(controller, x, y);
  return host && caretPosAt(controller, host, x, y);
}

// A block drawn without text, such as a divider, and the picture of a block drawn as a whole around its text, have no
// caret position, so files dropped on them are placed by the block, as a position with no region.
function textlessBlockAt(controller: ViewController, x: number, y: number): Pos | null {
  const element = controller.root?.ownerDocument.elementFromPoint(x, y);
  const block = element ? controller.blockAt(element) : undefined;
  if (block === undefined || controller.registry.locate(element ?? null) !== null) return null;
  const hasText = [...controller.registry.all()].some((host) => host.block === block);
  return hasText && !entersAsNode(controller, block) ? null : { block, region: '', offset: 0 };
}

export function handleDrop(controller: ViewController, event: DragEvent): void {
  event.preventDefault();
  const { dataTransfer } = event;
  if (!dataTransfer) return;
  const files = transferFiles(dataTransfer);
  const onBlock = files && textlessBlockAt(controller, event.clientX, event.clientY);
  if (files && onBlock) {
    controller.onFiles?.(files, onBlock);
    return;
  }
  const pos = dropPos(controller, event.clientX, event.clientY);
  if (pos) controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(pos)).setOrigin('drop'));
  pasteTransfer(controller, dataTransfer);
}

export function handleDragOver(event: DragEvent): void {
  const types = event.dataTransfer?.types ?? [];
  if (DROPPABLE.some((type) => types.includes(type))) event.preventDefault();
}

export function handleDragStart(event: DragEvent): void {
  event.preventDefault();
}
