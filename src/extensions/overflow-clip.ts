/** The nearest element between `host` and the canvas root that clips what overflows it, such as a wide table's. */
export function clipOf(host: HTMLElement, root: HTMLElement): HTMLElement | null {
  const view = host.ownerDocument.defaultView;
  for (let element = host.parentElement; element && element !== root; element = element.parentElement) {
    const { overflowX, overflowY } = view!.getComputedStyle(element);
    if (overflowX !== 'visible' || overflowY !== 'visible') return element;
  }
  return null;
}
