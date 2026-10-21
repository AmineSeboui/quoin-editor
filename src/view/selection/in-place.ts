type Scrolled = { readonly at: Element | Window; readonly left: number; readonly top: number };

function scrollOf(at: Element | Window): Scrolled {
  return 'scrollY' in at ? { at, left: at.scrollX, top: at.scrollY } : { at, left: at.scrollLeft, top: at.scrollTop };
}

/** Runs `change`, then puts back every scroller around `element` it moved, at once even where scrolling is smooth. */
export function inPlace(element: HTMLElement, change: () => void): void {
  const scrollers: (Element | Window)[] = [];
  for (let at = element.parentElement; at !== null; at = at.parentElement) scrollers.push(at);
  const view = element.ownerDocument.defaultView;
  if (view !== null) scrollers.push(view);
  const before = scrollers.map(scrollOf);
  change();
  for (const { at, left, top } of before) {
    const now = scrollOf(at);
    if (now.left !== left || now.top !== top) at.scrollTo({ left, top, behavior: 'instant' });
  }
}
