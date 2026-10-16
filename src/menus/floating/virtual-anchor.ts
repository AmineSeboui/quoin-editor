export type VirtualAnchor = { getBoundingClientRect(): DOMRect };

export type MenuSide = 'top' | 'bottom';

const ROOM_BELOW = 240;

/** An element-like anchor for a floating menu, measured on demand, that keeps its last box while nothing measures. */
export function virtualAnchor(measure: () => DOMRect | null): VirtualAnchor {
  let last = new DOMRect();
  return {
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
