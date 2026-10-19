import type { ViewController } from '../../view';

/** Marks the toolbars and the menus they open, where focus counts as still in the editor the value names. */
export const BUBBLE_PART = 'data-quoin-bubble';

const partIds = new WeakMap<ViewController, string>();
let created = 0;

// Each editor names its own parts, so focus in one canvas's toolbar or menu leaves the other canvases on the page out.
function partId(controller: ViewController): string {
  let id = partIds.get(controller);
  if (id === undefined) {
    created += 1;
    id = String(created);
    partIds.set(controller, id);
  }
  return id;
}

export function bubblePart(controller: ViewController): Record<typeof BUBBLE_PART, string> {
  return { [BUBBLE_PART]: partId(controller) };
}

export function isBubblePart(element: Element | null, controller: ViewController): boolean {
  return element?.closest(`[${BUBBLE_PART}]`)?.getAttribute(BUBBLE_PART) === partId(controller);
}

export function focusInEditor(controller: ViewController): boolean {
  const active = document.activeElement;
  return active !== null && (controller.isEditorElement(active) || isBubblePart(active, controller));
}
