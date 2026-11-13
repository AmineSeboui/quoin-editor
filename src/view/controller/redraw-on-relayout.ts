import { forgetDrawnSide } from './dom-selection';
import type { ViewController } from './view-controller';

/**
 * A caret at the end of a line before a soft wrap is drawn there only while a wrap falls where it is, and is written in
 * place once it no longer does. A relayout can put the wrap back with nothing moving the caret, so whenever the editor
 * changes size such a caret is written again.
 */
export function redrawOnRelayout(controller: ViewController, root: HTMLElement): () => void {
  const view = root.ownerDocument.defaultView;
  if (!view?.ResizeObserver) return () => {};
  const observer = new view.ResizeObserver(() => {
    const { selection } = controller.editor.state;
    const domSelection = controller.domSelection();
    if (selection?.kind !== 'text' || selection.assoc !== -1 || !domSelection) return;
    forgetDrawnSide(domSelection);
    controller.syncSelectionToDom();
  });
  observer.observe(root);
  return () => observer.disconnect();
}
