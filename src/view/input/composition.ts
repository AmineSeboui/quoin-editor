import type { ViewController } from '../controller/view-controller';
import { hostKey } from '../controller/host-registry';
import { reconcileHost } from './reconcile-host';

export type CompositionHandlers = {
  start(event: CompositionEvent): void;
  end(event: CompositionEvent): void;
  readonly active: boolean;
};

type Target = { readonly block: string; readonly region: string };

// Some browsers apply the committed text in an input event after compositionend, so the host is read once that event
// has run, or after a zero delay timeout when none comes.
export function createCompositionHandlers(controller: ViewController): CompositionHandlers {
  let active = false;
  let target: Target | null = null;
  let stopWaiting: (() => void) | null = null;

  function settle(): void {
    stopWaiting?.();
    stopWaiting = null;
    active = false;
    controller.composingKey = null;
    const host = target;
    target = null;
    if (host === null || reconcileHost(controller, host.block, host.region)) return;
    controller.renderHost(host.block, host.region);
    controller.syncSelectionToDom();
  }

  function waitForInput(element: HTMLElement | undefined): void {
    const onInput = () => settle();
    const timer = setTimeout(settle, 0);
    element?.addEventListener('input', onInput);
    stopWaiting = () => {
      clearTimeout(timer);
      element?.removeEventListener('input', onInput);
    };
  }

  return {
    start() {
      if (stopWaiting !== null) settle();
      const entry = controller.registry.locate(controller.domSelection()?.anchorNode ?? null);
      target = entry && { block: entry.block, region: entry.region };
      active = true;
      controller.composingKey = entry && hostKey(entry.block, entry.region);
    },
    end() {
      if (!active || stopWaiting !== null) return;
      waitForInput(target === null ? undefined : controller.registry.get(target.block, target.region));
    },
    get active() {
      return active;
    },
  };
}
