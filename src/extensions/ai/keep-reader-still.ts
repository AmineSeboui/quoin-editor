function scrollerOf(root: HTMLElement): Element | null {
  for (let element: Element | null = root; element !== null; element = element.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight) {
      return element;
    }
  }
  return root.ownerDocument.scrollingElement ?? null;
}

/**
 * Runs `change`, which changes the room under `shell`, then scrolls back by what it moved the content below, when
 * the reader has scrolled past the shell: they stay on what they were reading, whether or not the browser anchors
 * scrolling itself.
 */
export function keepReaderStill(root: HTMLElement, shell: Element, change: () => void): void {
  const scroller = scrollerOf(root);
  if (scroller === null) return change();
  const view = scroller === root.ownerDocument.scrollingElement ? 0 : scroller.getBoundingClientRect().top;
  if (shell.getBoundingClientRect().bottom > view) return change();
  const next = shell.nextElementSibling;
  const mark = () => (next === null ? root.getBoundingClientRect().bottom : next.getBoundingClientRect().top);
  const before = mark();
  change();
  // An explicit behaviour, as a page's smooth `scroll-behavior` would ease the correction in and lose part of it.
  scroller.scrollBy({ top: mark() - before, behavior: 'instant' });
}
