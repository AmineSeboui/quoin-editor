import type { ViewController } from '../view';
import { focusOwners } from '../view/react/focus-owners';

/** Whether `node` is in the canvas, or in a menu, popover or toolbar the canvas portals out of it. */
export function ownsNode(controller: ViewController, node: EventTarget | null): boolean {
  return node instanceof Node && (focusOwners.get(node) === controller || controller.root?.contains(node) === true);
}

/**
 * Tells `listener` whether focus is in the canvas, as `ownsNode` says, each time it moves. Focus that falls to the
 * body stays in the canvas only when the element of the canvas it fell from is gone, as a closing popover's is.
 */
export function watchCanvasFocus(
  controller: ViewController,
  doc: Document,
  listener: (inside: boolean, node: EventTarget | null) => void,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const moved = (event: FocusEvent) => listener(ownsNode(controller, event.target), event.target);
  const left = ({ target, relatedTarget }: FocusEvent) => {
    if (relatedTarget !== null || !ownsNode(controller, target)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const active = doc.activeElement;
      if ((active === null || active === doc.body) && (target as Node).isConnected) listener(false, active);
    });
  };
  doc.addEventListener('focusin', moved);
  doc.addEventListener('focusout', left);
  return () => {
    clearTimeout(timer);
    doc.removeEventListener('focusin', moved);
    doc.removeEventListener('focusout', left);
  };
}
