type Offset = readonly [Element | Window, number, number];

const offsetOf = (at: Element | Window): Offset =>
  'scrollY' in at ? [at, at.scrollX, at.scrollY] : [at, at.scrollLeft, at.scrollTop];

/**
 * Runs `change`, then puts `element`, every element around it and the window back where they had scrolled to, at once
 * even where the page scrolls smoothly.
 */
export function keepScroll(element: Element, change: () => void): void {
  const scrollers: (Element | Window)[] = [];
  for (let at: Element | null = element; at !== null; at = at.parentElement) scrollers.push(at);
  const view = element.ownerDocument.defaultView;
  if (view !== null) scrollers.push(view);
  const before = scrollers.map(offsetOf);
  change();
  for (const [at, left, top] of before) {
    const [, nowLeft, nowTop] = offsetOf(at);
    if (nowLeft !== left || nowTop !== top) at.scrollTo({ left, top, behavior: 'instant' });
  }
}
