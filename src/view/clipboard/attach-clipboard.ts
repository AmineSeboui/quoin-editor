import type { ViewController } from '../controller/view-controller';
import { handleCopy, handlePaste } from './clipboard-events';
import { handleDragOver, handleDragStart, handleDrop } from './drop-events';

// Copy, cut and paste act on the editor's own elements and on the host of an empty document, which is no region of
// any block, so a field inside a block keeps its native clipboard. A read-only editor only copies. catchUp applies
// what the browser changed first, because the selectionchange for the caret a shortcut acts on may still be queued.
export function attachClipboard(controller: ViewController, root: HTMLElement, catchUp: () => void): () => void {
  const inEmptyHost = (target: Element): boolean => target.closest?.('[data-quoin-empty]') != null;
  const inEditor = ({ target }: Event): boolean =>
    controller.registry.locate(target as Node | null) !== null ||
    controller.isEditorElement(target as Element) ||
    inEmptyHost(target as Element);
  const inField = ({ target }: Event): boolean =>
    (target as Element | null)?.closest?.('input, textarea, select') != null;
  const droppable = (event: Event): boolean => !controller.readOnly && !inField(event);

  const onCopy = (event: Event): void => {
    if (!inEditor(event)) return;
    catchUp();
    handleCopy(controller, event as ClipboardEvent, false);
  };
  const onCut = (event: Event): void => {
    if (controller.readOnly || !inEditor(event)) return;
    catchUp();
    handleCopy(controller, event as ClipboardEvent, true);
  };
  const onPaste = (event: Event): void => {
    if (controller.readOnly || !inEditor(event)) return;
    catchUp();
    handlePaste(controller, event as ClipboardEvent);
  };
  const onDragStart = (event: Event): void => {
    if (controller.registry.locate(event.target as Node | null) !== null) handleDragStart(event as DragEvent);
  };
  const onDragOver = (event: Event): void => {
    if (droppable(event)) handleDragOver(event as DragEvent);
  };
  const onDrop = (event: Event): void => {
    if (droppable(event)) handleDrop(controller, event as DragEvent);
  };

  const listeners: [string, (event: Event) => void][] = [
    ['copy', onCopy],
    ['cut', onCut],
    ['paste', onPaste],
    ['dragstart', onDragStart],
    ['dragover', onDragOver],
    ['drop', onDrop],
  ];
  for (const [type, listener] of listeners) root.addEventListener(type, listener);
  return () => {
    for (const [type, listener] of listeners) root.removeEventListener(type, listener);
  };
}
