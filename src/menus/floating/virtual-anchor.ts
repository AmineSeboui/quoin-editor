export type VirtualAnchor = { getBoundingClientRect(): DOMRect; contextElement?: Element };

export type MenuSide = 'top' | 'bottom';

const ROOM_BELOW = 240;

/**
 * An element-like anchor for a floating menu, measured on demand, that keeps its last box while nothing measures.
 * Floating UI repositions the menu when an ancestor of `contextElement` scrolls, so a menu anchored in text inside a
 * scrolling container follows its line.
 */
export function virtualAnchor(measure: () => DOMRect | null, contextElement?: Element): VirtualAnchor {
  let last = new DOMRect();
  return {
    contextElement,
    getBoundingClientRect() {
      last = measure() ?? last;
      return last;
    },
  };
}

/** Below the anchor, unless less than 240 px of the window is left under it. */
export function sideFor(anchor: DOMRect, viewportHeight: number): MenuSide {
  return viewportHeight - anchor.bottom < ROOM_BELOW ? 'top' : 'bottom';
}
