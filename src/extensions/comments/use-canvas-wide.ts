import { useState, type RefObject } from 'react';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';

/** The width from which a canvas holds the rail of threads beside its text rather than markers and a sheet. */
export const WIDE_CANVAS = 800;

/**
 * Whether the canvas an element is drawn in is wide, measured on the canvas's border box, which the room the comments
 * reserve inside it does not change; `initial` until it is measured, as on the server.
 */
export function useCanvasWide(box: RefObject<HTMLElement | null>, initial: boolean): boolean {
  const [wide, setWide] = useState(initial);
  useIsomorphicLayoutEffect(() => {
    const canvas = box.current?.parentElement;
    if (!canvas) return undefined;
    const measure = () => setWide(canvas.offsetWidth >= WIDE_CANVAS);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [box]);
  return wide;
}
