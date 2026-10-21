import type { ViewController } from 'quoin-editor/headless';

// Typing, keys and commands all reach the document through edit(), and dispatch() calls it too, so one wrapper times the
// change, the React flush, the host render and the selection write together. A key that changes nothing is not an edit.
export function timeEdits(controller: ViewController): () => void {
  const edit = controller.edit.bind(controller);
  controller.edit = (change) => {
    const before = controller.editor.state;
    const start = performance.now();
    const handled = edit(change);
    if (controller.editor.state !== before) window.__quoin.timings?.push(performance.now() - start);
    return handled;
  };
  return () => {
    controller.edit = edit;
  };
}
