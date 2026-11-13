import { useSyncExternalStore } from 'react';

export type VisualViewportBox = { offsetTop: number; offsetLeft: number; height: number; width: number; scale: number };

const KEYS = ['offsetTop', 'offsetLeft', 'height', 'width', 'scale'] as const;

const EVENTS = ['resize', 'scroll'] as const;

function subscribe(notify: () => void): () => void {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  for (const type of EVENTS) viewport.addEventListener(type, notify);
  return () => {
    for (const type of EVENTS) viewport.removeEventListener(type, notify);
  };
}

let last: VisualViewportBox | null = null;

function read(): VisualViewportBox | null {
  const viewport = window.visualViewport;
  if (!viewport) return null;
  const box = Object.fromEntries(KEYS.map((key) => [key, viewport[key]])) as VisualViewportBox;
  if (last === null || KEYS.some((key) => last?.[key] !== box[key])) last = box;
  return last;
}

const readOnServer = () => null;

/**
 * The part of the page left visible, which a virtual keyboard shrinks, a pinch zoom shrinks and scales, and which can
 * scroll within the page.
 */
export function useVisualViewport(): VisualViewportBox | null {
  return useSyncExternalStore(subscribe, read, readOnServer);
}
