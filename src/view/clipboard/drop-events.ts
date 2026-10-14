import type { Pos } from '../../engine';
import { textSelection } from '../../engine/state/selection';
import type { ViewController } from '../controller/view-controller';
import { caretPosAt, hostAt } from '../selection/pointer-targets';
import { pasteTransfer } from './paste-transfer';

const DROPPABLE = ['Files', 'text/plain', 'text/html'];

function dropPos(controller: ViewController, x: number, y: number): Pos | null {
  const host = hostAt(controller, x, y);
  return host && caretPosAt(controller, host, x, y);
}

export function handleDrop(controller: ViewController, event: DragEvent): void {
  event.preventDefault();
  const { dataTransfer } = event;
  if (!dataTransfer) return;
  const pos = dropPos(controller, event.clientX, event.clientY);
  if (pos) controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(pos)));
  pasteTransfer(controller, dataTransfer);
}

export function handleDragOver(event: DragEvent): void {
  const types = event.dataTransfer?.types ?? [];
  if (DROPPABLE.some((type) => types.includes(type))) event.preventDefault();
}

export function handleDragStart(event: DragEvent): void {
  event.preventDefault();
}
