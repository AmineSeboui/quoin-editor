import { useEffect } from 'react';
import { startOf } from '../engine/state/selection';
import type { ViewController } from '../view';
import { linkedBlockId } from './block-link';

// Shell ids are scoped to their editor, so two editors showing one document never share one, and a `#block-<id>`
// fragment never reaches a shell by itself: the canvas follows it instead. The selection is dispatched to the editor
// rather than through the controller, whose synchronous flush React refuses from inside an effect; the view writes it
// to the page once it has drawn it.
function revealLinkedBlock(controller: ViewController, hash: string): boolean {
  const id = linkedBlockId(hash);
  const shell = id === null ? undefined : controller.blockElement(id);
  if (id === null || shell === undefined) return false;
  const { editor } = controller;
  const { doc, schema } = editor.state;
  editor.dispatch(editor.createTransaction().setSelection(startOf(doc, schema, id)));
  shell.scrollIntoView({ block: 'center' });
  return true;
}

/**
 * Selects the block the page's `#block-<id>` fragment links to, on mount and whenever the hash changes, and scrolls it
 * into view. On mount it takes focus only when the canvas focuses itself, then going to the linked block rather than
 * the start; a hash change is the reader following a link, so focus moves to the block.
 */
export function useBlockLinkTarget(controller: ViewController, focusOnMount: boolean): void {
  useEffect(() => {
    const view = controller.root?.ownerDocument.defaultView ?? window;
    const linked = revealLinkedBlock(controller, view.location.hash);
    if (focusOnMount) controller.focus(linked ? undefined : 'start');
    const onHashChange = () => {
      if (revealLinkedBlock(controller, view.location.hash)) controller.focus();
    };
    view.addEventListener('hashchange', onHashChange);
    return () => view.removeEventListener('hashchange', onHashChange);
  }, [controller, focusOnMount]);
}
