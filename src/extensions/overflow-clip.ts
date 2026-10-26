/** The boxes of the elements between `host` and the canvas root that clip what overflows them, such as a wide table's. */
export function clipBoxes(host: HTMLElement, root: HTMLElement): DOMRect[] {
  const boxes: DOMRect[] = [];
  for (let element = host.parentElement; element && element !== root; element = element.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(element);
    if (overflowX + overflowY !== 'visiblevisible') boxes.push(element.getBoundingClientRect());
  }
  return boxes;
}
