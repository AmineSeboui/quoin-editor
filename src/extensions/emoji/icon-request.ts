import { useCallback, useSyncExternalStore } from 'react';
import type { ViewController } from '../../view';

/** The callouts whose icon the picker is open for, the first being the one its block menu was opened on. */
export type IconRequest = { readonly blocks: readonly string[] };

type Store = { request: IconRequest | null; readonly listeners: Set<() => void> };

const stores = new WeakMap<ViewController, Store>();

function storeOf(controller: ViewController): Store {
  let store = stores.get(controller);
  if (store === undefined) {
    store = { request: null, listeners: new Set() };
    stores.set(controller, store);
  }
  return store;
}

/** Opens the icon picker of the canvas for the callouts of `request`, or closes it. */
export function requestIcon(controller: ViewController, request: IconRequest | null): void {
  const store = storeOf(controller);
  if (store.request === request) return;
  store.request = request;
  for (const listener of [...store.listeners]) listener();
}

export function useIconRequest(controller: ViewController): IconRequest | null {
  const subscribe = useCallback(
    (notify: () => void) => {
      const { listeners } = storeOf(controller);
      listeners.add(notify);
      return () => void listeners.delete(notify);
    },
    [controller],
  );
  const read = useCallback(() => storeOf(controller).request, [controller]);
  return useSyncExternalStore(subscribe, read, read);
}
