import { useSyncExternalStore } from 'react';

export type VisualViewportBox = { offsetTop: number; height: number; width: number };

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
  const { offsetTop, height, width } = viewport;
  if (last?.offsetTop !== offsetTop || last.height !== height || last.width !== width) {
    last = { offsetTop, height, width };
  }
  return last;
}

const readOnServer = () => null;

/** The part of the page left visible, which a virtual keyboard shrinks and which can scroll within the page. */
export function useVisualViewport(): VisualViewportBox | null {
  return useSyncExternalStore(subscribe, read, readOnServer);
}
