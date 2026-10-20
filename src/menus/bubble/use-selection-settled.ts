import { useMemo, useSyncExternalStore } from 'react';
import type { ViewController } from '../../view';
import { focusInEditor } from './bubble-part';

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
  // These capture listeners hear compositionstart before the view does, which the flag covers. The view applies the
  // composed text after compositionend and clears composingKey just before the transaction that brings it.
  const viewComposing = () => controller.composingKey !== null;
  return {
    read: () => focusInEditor(controller) && !pressed && !composing && !viewComposing(),
    subscribe(notify) {
      const listeners = Object.entries(handlers).map(([type, handle]) => {
        const listener = (event: Event) => {
          handle(event);
          notify();
        };
        document.addEventListener(type, listener, true);
        return () => document.removeEventListener(type, listener, true);
      });
      const stopState = controller.editor.subscribe(() => notify());
      return () => {
        listeners.forEach((remove) => remove());
        stopState();
      };
    },
  };
}

const NOT_SETTLED = () => false;

/**
 * Whether the writer has finished making the selection: focus is in the editor or on the toolbar, no pointer pressed in
 * the text is still down and no composition is running or waiting for the view to apply it.
 */
export function useSelectionSettled(controller: ViewController): boolean {
  const settled = useMemo(() => createSettled(controller), [controller]);
  return useSyncExternalStore(settled.subscribe, settled.read, NOT_SETTLED);
}
