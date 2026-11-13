const SCROLLS = new Set(['auto', 'scroll']);

const scrollsVertically = (element: HTMLElement): boolean =>
  SCROLLS.has(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight;

// Up the tree as it is drawn: from a slotted element to its slot, and from the top of a shadow tree to its host.
function drawnParent(element: HTMLElement): HTMLElement | null {
  if (element.assignedSlot) return element.assignedSlot;
  if (element.parentElement) return element.parentElement;
  const parent = element.parentNode;
  return parent && 'host' in parent ? (parent.host as HTMLElement) : null;
}

// The body's overflow scrolls the window, unless the root element keeps an overflow of its own, which leaves the body
// to scroll itself.
const scrollsItself = (body: HTMLElement): boolean =>
  getComputedStyle(body.ownerDocument.documentElement).overflowY !== 'visible' && scrollsVertically(body);

/** Every element from `element` up that scrolls vertically, nearest first; the window, which scrolls the page, is not. */
export function scrollContainersOf(element: HTMLElement): HTMLElement[] {
  const { body, documentElement } = element.ownerDocument;
  const containers: HTMLElement[] = [];
  for (let node: HTMLElement | null = element; node !== null && node !== documentElement; node = drawnParent(node)) {
    if (node === body ? scrollsItself(node) : scrollsVertically(node)) containers.push(node);
  }
  return containers;
}
