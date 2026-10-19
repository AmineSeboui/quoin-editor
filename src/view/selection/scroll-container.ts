const SCROLLS = new Set(['auto', 'scroll']);

const scrollsVertically = (element: HTMLElement): boolean =>
  SCROLLS.has(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight;

/** The nearest element from `element` up that scrolls vertically, or null when only the page scrolls. */
export function scrollContainerOf(element: HTMLElement): HTMLElement | null {
  const { body, documentElement } = element.ownerDocument;
  for (let node: HTMLElement | null = element; node !== null; node = node.parentElement) {
    if (node === body || node === documentElement) return null;
    if (scrollsVertically(node)) return node;
  }
  return null;
}
