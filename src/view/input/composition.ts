import type { ViewController } from '../controller/view-controller';
import { hostKey } from '../controller/host-registry';
import { commitEmptyHost } from './commit-empty-host';
import { snapshotComposition, type CompositionSnapshot } from './composition-snapshot';

export type CompositionHandlers = {
  start(event: CompositionEvent): void;
  end(event: CompositionEvent): void;
  release(): void;
  readonly active: boolean;
};

const EMPTY_HOST = 'empty';

type Target = { readonly block: string; readonly region: string } | typeof EMPTY_HOST;

function targetAt(controller: ViewController, node: Node | null): Target | null {
  const entry = controller.registry.locate(node);
  if (entry !== null) return { block: entry.block, region: entry.region };
  return node !== null && controller.emptyHost?.contains(node) ? EMPTY_HOST : null;
}

function elementOf(controller: ViewController, target: Target | null): HTMLElement | undefined {
  if (target === EMPTY_HOST) return controller.emptyHost ?? undefined;
  return target === null ? undefined : controller.registry.get(target.block, target.region);
}

// Some browsers apply the committed text in an input event after compositionend, so the host is read once that event
// has run, or after a zero delay timeout when none comes.
export function createCompositionHandlers(controller: ViewController): CompositionHandlers {
  let active = false;
  let target: Target | null = null;
  let snapshot: CompositionSnapshot | null = null;
  let stopWaiting: (() => void) | null = null;

  function settle(): void {
    stopWaiting?.();
    stopWaiting = null;
    active = false;
    controller.composingKey = null;
    const host = target;
    const started = snapshot;
    target = null;
    snapshot = null;
    if (host === EMPTY_HOST) commitEmptyHost(controller);
    else if (host !== null && !started?.settle()) {
      controller.renderHost(host.block, host.region);
      controller.syncSelectionToDom();
    }
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
      snapshot?.release();
      target = targetAt(controller, controller.domSelection()?.anchorNode ?? null);
      const host = target === EMPTY_HOST ? null : target;
      snapshot = host && snapshotComposition(controller, host.block, host.region);
      active = true;
      controller.composingKey = target === null || target === EMPTY_HOST ? target : hostKey(target.block, target.region);
    },
    end() {
      if (!active || stopWaiting !== null) return;
      waitForInput(elementOf(controller, target));
    },
    release() {
      snapshot?.release();
      snapshot = null;
    },
    get active() {
      return active;
    },
  };
}
