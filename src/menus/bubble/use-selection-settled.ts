import { useMemo, useSyncExternalStore } from 'react';
import type { ViewController } from '../../view';

/** Marks the toolbars and the menus they open, where focus counts as still in the editor. */
export const BUBBLE_PART = 'data-quoin-bubble';

export const isBubblePart = (element: Element | null): boolean => element?.closest(`[${BUBBLE_PART}]`) != null;

export function focusInEditor(controller: ViewController): boolean {
  const active = document.activeElement;
  return active !== null && (controller.isEditorElement(active) || isBubblePart(active));
}

type Settled = { read(): boolean; subscribe(notify: () => void): () => void };

function createSettled(controller: ViewController): Settled {
  let pressed = false;
  let composing = false;
  const inEditor = (event: Event) => event.target instanceof Node && controller.root?.contains(event.target) === true;
  const handlers: Readonly<Record<string, (event: Event) => void>> = {
    pointerdown: (event) => void (pressed ||= inEditor(event)),
    pointerup: () => void (pressed = false),
    pointercancel: () => void (pressed = false),
    compositionstart: (event) => void (composing ||= inEditor(event)),
    compositionend: () => void (composing = false),
    focusin: () => {},
    focusout: () => {},
  };
  return {
    read: () => focusInEditor(controller) && !pressed && !composing,
    subscribe(notify) {
      const listeners = Object.entries(handlers).map(([type, handle]) => {
        const listener = (event: Event) => {
          handle(event);
          notify();
        };
        document.addEventListener(type, listener, true);
        return () => document.removeEventListener(type, listener, true);
      });
      return () => listeners.forEach((remove) => remove());
    },
  };
}

const NOT_SETTLED = () => false;

/**
 * Whether the writer has finished making the selection: focus is in the editor or on the toolbar, no pointer pressed in
 * the text is still down and no composition is running.
 */
export function useSelectionSettled(controller: ViewController): boolean {
  const settled = useMemo(() => createSettled(controller), [controller]);
  return useSyncExternalStore(settled.subscribe, settled.read, NOT_SETTLED);
}
