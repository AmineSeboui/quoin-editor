export type AutoScroll = { update(clientY: number): void; stop(): void };

const EDGE = 40;
const MAX_STEP = 20;

const step = (depth: number): number => Math.ceil((Math.min(depth, EDGE) / EDGE) * MAX_STEP);

export function createAutoScroll(win: Window, onScroll: () => void): AutoScroll {
  let delta = 0;
  let frame: number | null = null;

  function tick(): void {
    frame = null;
    if (delta === 0) return;
    win.scrollBy(0, delta);
    onScroll();
    frame = win.requestAnimationFrame(tick);
  }

  return {
    update(clientY) {
      const bottom = win.innerHeight - EDGE;
      delta = clientY < EDGE ? -step(EDGE - clientY) : clientY > bottom ? step(clientY - bottom) : 0;
      if (delta !== 0 && frame === null) frame = win.requestAnimationFrame(tick);
    },
    stop() {
      delta = 0;
      if (frame !== null) win.cancelAnimationFrame(frame);
      frame = null;
    },
  };
}
