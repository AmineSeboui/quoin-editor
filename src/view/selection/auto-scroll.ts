import { scrollContainerOf } from './scroll-container';

export type AutoScroll = { update(clientY: number): void; stop(): void };

const EDGE = 40;
const MAX_STEP = 20;

// A container that reaches past the window scrolls from the window's edges, the only ones the pointer can reach.
function edgesOf(container: HTMLElement | null, win: Window): { top: number; bottom: number } {
  if (container === null) return { top: 0, bottom: win.innerHeight };
  const top = container.getBoundingClientRect().top + container.clientTop;
  return { top: Math.max(top, 0), bottom: Math.min(top + container.clientHeight, win.innerHeight) };
}

/**
 * Scrolls the nearest container of `element` that scrolls, or the window when there is none, every frame while the
 * pointer is near its top or bottom edge. The container is found again for each drag.
 */
export function createAutoScroll(element: HTMLElement, onScroll: () => void, edge = EDGE): AutoScroll {
  const win = element.ownerDocument.defaultView as Window;
  let container: HTMLElement | null | undefined;
  let delta = 0;
  let frame: number | null = null;
  const step = (depth: number): number => Math.ceil((Math.min(depth, edge) / edge) * MAX_STEP);

  function tick(): void {
    frame = null;
    if (delta === 0) return;
    (container ?? win).scrollBy(0, delta);
    onScroll();
    frame = win.requestAnimationFrame(tick);
  }

  return {
    update(clientY) {
      if (container === undefined) container = scrollContainerOf(element);
      const { top, bottom } = edgesOf(container, win);
      const [upper, lower] = [top + edge, bottom - edge];
      delta = clientY < upper ? -step(upper - clientY) : clientY > lower ? step(clientY - lower) : 0;
      if (delta !== 0 && frame === null) frame = win.requestAnimationFrame(tick);
    },
    stop() {
      delta = 0;
      container = undefined;
      if (frame !== null) win.cancelAnimationFrame(frame);
      frame = null;
    },
  };
}
