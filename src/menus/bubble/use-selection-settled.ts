import { useMemo, useSyncExternalStore } from 'react';
import type { ViewController } from '../../view';
import { listen } from '../../view/dom/listen';
import { focusInEditor } from '../../toolbar/bubble-part';

type Settled = { read(): boolean; subscribe(notify: () => void): () => void };

function createSettled(controller: ViewController): Settled {
  let pressed = false;
  let composing = false;
  const inEditor = (event: Event) => event.target instanceof Node && controller.root?.contains(event.target) === true;
  const release = () => void (pressed = false);
  // A press can end without a pointerup: in a native drag of the selection, or when the window loses focus mid-press.
  const handlers: Readonly<Record<string, (event: Event) => void>> = {
    pointerdown: (event) => void (pressed ||= inEditor(event)),
    pointerup: release,
    pointercancel: release,
    dragend: release,
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
      const doc = controller.root?.ownerDocument ?? document;
      const listeners = Object.entries(handlers).map(([type, handle]) => {
        const listener = (event: Event) => {
          handle(event);
          notify();
        };
        doc.addEventListener(type, listener, true);
        return () => doc.removeEventListener(type, listener, true);
      });
      const timers = new Set<ReturnType<typeof setTimeout>>();
      // A composition that writes the text it replaced over again brings no transaction, so the toolbar looks again once
      // the view has settled it, which it does at the input that follows compositionend or a zero delay after it. This
      // listener bubbles, so it runs after the root's own has queued that delay.
      const afterView = () => {
        const timer = setTimeout(() => {
          timers.delete(timer);
          notify();
        }, 0);
        timers.add(timer);
      };
      const stopDoc = listen(doc, { compositionend: afterView });
      const onWindowBlur = () => {
        release();
        notify();
      };
      const stopWindow = doc.defaultView ? listen(doc.defaultView, { blur: onWindowBlur }) : () => {};
      const stopState = controller.editor.subscribe(() => notify());
      return () => {
        listeners.forEach((remove) => remove());
        timers.forEach(clearTimeout);
        stopDoc();
        stopWindow();
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
