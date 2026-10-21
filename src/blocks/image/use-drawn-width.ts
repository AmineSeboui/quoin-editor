'use client';

import { useEffect, useState, type RefObject } from 'react';
import { drawnWidth, MAX_WIDTH } from './resize-width';

/** The share of its block a picture is drawn at, followed as the picture loads and as the block is resized. */
export function useDrawnWidth(frame: RefObject<HTMLElement | null>, watching: boolean): number {
  const [drawn, setDrawn] = useState(MAX_WIDTH);
  useEffect(() => {
    const element = frame.current;
    if (!watching || element === null) return;
    const measure = () => setDrawn(drawnWidth(element));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.parentElement !== null) observer.observe(element.parentElement);
    return () => observer.disconnect();
  }, [frame, watching]);
  return drawn;
}
