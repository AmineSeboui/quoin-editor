export const MIN_WIDTH = 10;
export const MAX_WIDTH = 100;
const STEP = 5;

/** A width in percent of the block, to the nearest 5 percent between 10 and 100. */
export const snapWidth = (percent: number): number =>
  Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(percent / STEP) * STEP));

const KEYS: Readonly<Record<string, (percent: number) => number>> = {
  ArrowRight: (percent) => snapWidth(percent + STEP),
  ArrowUp: (percent) => snapWidth(percent + STEP),
  ArrowLeft: (percent) => snapWidth(percent - STEP),
  ArrowDown: (percent) => snapWidth(percent - STEP),
  Home: () => MIN_WIDTH,
  End: () => MAX_WIDTH,
};

/** The width a key gives a width slider, or null for a key the slider leaves alone. */
export const keyedWidth = (key: string, percent: number): number | null =>
  Object.hasOwn(KEYS, key) ? KEYS[key](percent) : null;

/** The share of its block a picture is drawn at, or the whole block before it is laid out. */
export function drawnWidth(frame: HTMLElement | null): number {
  const block = frame?.parentElement?.clientWidth ?? 0;
  return frame && block > 0 ? snapWidth((frame.offsetWidth / block) * 100) : MAX_WIDTH;
}
