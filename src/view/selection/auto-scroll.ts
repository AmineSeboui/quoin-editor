import { scrollContainersOf } from './scroll-container';

export type AutoScroll = { update(clientY: number): void; stop(): void };

const EDGE = 40;
const MAX_STEP = 20;

/** A container that scrolls, or null for the window. */
type Scroller = HTMLElement | null;

// A container that reaches past the window scrolls from the window's edges, the only ones the pointer can reach.
function edgesOf(container: Scroller, win: Window): { top: number; bottom: number } {
  if (container === null) return { top: 0, bottom: win.innerHeight };
  const top = container.getBoundingClientRect().top + container.clientTop;
  return { top: Math.max(top, 0), bottom: Math.min(top + container.clientHeight, win.innerHeight) };
}

const hasRoom = (container: HTMLElement, delta: number): boolean =>
  delta < 0 ? container.scrollTop > 0 : Math.ceil(container.scrollTop) + container.clientHeight < container.scrollHeight;

/**
 * Scrolls every frame while the pointer is near the top or bottom edge of a container `element` sits in: the nearest
 * one that can still scroll that way, so each hands on to the one around it as it reaches its end, and the window last.
 * The containers are found again for each drag.
 */
export function createAutoScroll(element: HTMLElement, onScroll: () => void, edge = EDGE): AutoScroll {
  const win = element.ownerDocument.defaultView as Window;
  let scrollers: Scroller[] | null = null;
  let pointerY = 0;
  let frame: number | null = null;
  const step = (depth: number): number => Math.ceil((Math.min(depth, edge) / edge) * MAX_STEP);

  function deltaIn(container: Scroller): number {
    const { top, bottom } = edgesOf(container, win);
    const [upper, lower] = [top + edge, bottom - edge];
    return pointerY < upper ? -step(upper - pointerY) : pointerY > lower ? step(pointerY - lower) : 0;
  }

  function next(): { scroller: Scroller; delta: number } | null {
    scrollers ??= [...scrollContainersOf(element), null];
    for (const scroller of scrollers) {
      const delta = deltaIn(scroller);
      if (delta !== 0 && (scroller === null || hasRoom(scroller, delta))) return { scroller, delta };
    }
    return null;
  }

  function tick(): void {
    frame = null;
    const target = next();
    if (target === null) return;
    (target.scroller ?? win).scrollBy(0, target.delta);
    onScroll();
    frame = win.requestAnimationFrame(tick);
  }

  return {
    update(clientY) {
      pointerY = clientY;
      if (frame === null && next() !== null) frame = win.requestAnimationFrame(tick);
    },
    stop() {
      scrollers = null;
      if (frame !== null) win.cancelAnimationFrame(frame);
      frame = null;
    },
  };
}
