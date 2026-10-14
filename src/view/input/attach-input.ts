import type { ViewController } from '../controller/view-controller';
import { handleBeforeInput } from './before-input';
import { createCompositionHandlers } from './composition';
import { createDomInputFallback } from './dom-input';
import { handleKeydown, isComposingKey } from './keydown';

export type AttachedInput = {
  observe(host: HTMLElement): void;
  unobserve(host: HTMLElement): void;
  detach(): void;
};

export function attachInput(controller: ViewController, root: HTMLElement): AttachedInput {
  const composition = createCompositionHandlers(controller);
  const fallback = createDomInputFallback(controller);
  const observed = new Map<HTMLElement, () => void>();
  const inHost = (event: Event) => controller.registry.locate(event.target as Node | null) !== null;

  // Pending browser edits are applied and the caret is read before a model command runs: Chromium dispatches input
  // ahead of the selectionchange task a caret move queued, and mutation records wait for a microtask.
  const catchUp = () => {
    fallback.flush();
    controller.readSelectionFromDom();
  };
  const onBeforeInput = (event: InputEvent) => {
    if (!inHost(event)) return;
    catchUp();
    handleBeforeInput(controller, event);
  };
  // Browsers fire no beforeinput for some keymap keys (Mod+Z with an empty native undo stack, Backspace at the start of
  // a host, Shift+Enter and Mod+B in WebKit), so the keymap runs on keydown.
  const onKeyDown = (event: KeyboardEvent) => {
    if (isComposingKey(controller, event) || controller.readOnly) return;
    if (!controller.isEditorElement(event.target as Element)) return;
    catchUp();
    handleKeydown(controller, event);
  };
  const onInput = (event: Event) => fallback.onInput(event as InputEvent);
  const onCompositionStart = (event: CompositionEvent) => {
    if (inHost(event)) composition.start(event);
  };
  const onCompositionEnd = (event: CompositionEvent) => composition.end(event);

  root.addEventListener('keydown', onKeyDown);
  root.addEventListener('beforeinput', onBeforeInput);
  root.addEventListener('input', onInput);
  root.addEventListener('compositionstart', onCompositionStart);
  root.addEventListener('compositionend', onCompositionEnd);

  function observe(host: HTMLElement): void {
    if (!observed.has(host)) observed.set(host, fallback.observe(host));
  }

  for (const { element } of controller.registry.all()) observe(element);

  return {
    observe,
    unobserve(host) {
      observed.get(host)?.();
      observed.delete(host);
    },
    detach() {
      root.removeEventListener('keydown', onKeyDown);
      root.removeEventListener('beforeinput', onBeforeInput);
      root.removeEventListener('input', onInput);
      root.removeEventListener('compositionstart', onCompositionStart);
      root.removeEventListener('compositionend', onCompositionEnd);
      for (const stop of observed.values()) stop();
      observed.clear();
    },
  };
}
