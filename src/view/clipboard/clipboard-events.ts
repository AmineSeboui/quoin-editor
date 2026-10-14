import { deleteSelection } from '../../engine/commands/delete-commands';
import type { ViewController } from '../controller/view-controller';
import { pasteTransfer } from './paste-transfer';
import { QUOIN_SLICE_TYPE, wrapSliceHTML } from './slice-marker';

export function handleCopy(controller: ViewController, event: ClipboardEvent, cut: boolean): void {
  const { clipboardData } = event;
  if (!clipboardData) return;
  const copied = controller.editor.copy();
  if (copied === null) return;
  event.preventDefault();
  clipboardData.setData('text/plain', copied.text);
  clipboardData.setData('text/html', wrapSliceHTML(copied.html, copied.json));
  clipboardData.setData(QUOIN_SLICE_TYPE, copied.json);
  if (cut) controller.run(deleteSelection);
}

export function handlePaste(controller: ViewController, event: ClipboardEvent): void {
  if (!event.clipboardData) return;
  event.preventDefault();
  pasteTransfer(controller, event.clipboardData);
}
