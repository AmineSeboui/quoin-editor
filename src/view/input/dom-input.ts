import type { ViewController } from '../controller/view-controller';
import { hostKey, type HostEntry } from '../controller/host-registry';
import { reconcileHost } from './reconcile-host';

export type DomInputFallback = {
  onInput(event: InputEvent): void;
  observe(host: HTMLElement): () => void;
  flush(): void;
};

const OBSERVED: MutationObserverInit = { characterData: true, childList: true, subtree: true };

// Mutation records arrive after the change that caused them, so the renderer's own writes are reported too. They leave
// the host equal to the model, which reconcileHost answers with no transaction.
export function createDomInputFallback(controller: ViewController): DomInputFallback {
  const pending = new Map<string, HostEntry>();
  const observers = new Map<MutationObserver, HTMLElement>();
  let queued = false;

  function enqueue(node: Node | null): boolean {
    const entry = controller.registry.locate(node);
    if (entry === null || controller.composingKey !== null) return false;
    pending.set(hostKey(entry.block, entry.region), entry);
    return true;
  }

  function flush(): void {
    queued = false;
    for (const [observer, host] of observers) if (observer.takeRecords().length > 0) enqueue(host);
    for (const [key, { block, region }] of [...pending]) {
      pending.delete(key);
      if (controller.composingKey !== key) reconcileHost(controller, block, region);
    }
  }

  function schedule(node: Node | null): void {
    if (!enqueue(node) || queued) return;
    queued = true;
    queueMicrotask(() => {
      if (queued) flush();
    });
  }

  return {
    onInput(event) {
      if (!event.isComposing && !event.defaultPrevented) schedule(event.target as Node | null);
    },
    observe(host) {
      const observer = new MutationObserver(() => schedule(host));
      observer.observe(host, OBSERVED);
      observers.set(observer, host);
      return () => {
        observer.disconnect();
        observers.delete(observer);
      };
    },
    flush,
  };
}
