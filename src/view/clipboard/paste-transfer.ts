import type { Pos } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import { QUOIN_SLICE_TYPE, readSliceHTML } from './slice-marker';

function caretOf(controller: ViewController): Pos | null {
  const { selection } = controller.editor.state;
  return selection?.kind === 'text' ? selection.head : null;
}

// Shared by paste and drop. Files only count when the transfer carries no text, because a page or spreadsheet copied
// with its image arrives as HTML plus a rendering of itself.
export function pasteTransfer(controller: ViewController, transfer: DataTransfer): void {
  const text = transfer.getData('text/plain');
  const html = transfer.getData('text/html');
  const files = Array.from(transfer.files);
  if (files.length > 0 && !text && !html) {
    controller.onFiles?.(files, caretOf(controller));
    return;
  }
  const json = transfer.getData(QUOIN_SLICE_TYPE) || readSliceHTML(html) || undefined;
  const data = { json, html: html || undefined, text: text || undefined };
  if (controller.edit(() => controller.editor.paste(data))) controller.focus();
}
