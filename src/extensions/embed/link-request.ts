import { useCallback, useSyncExternalStore } from 'react';
import type { SuggestionRange } from '../ui-types';
import type { ViewController } from '../../view';

export type LinkKind = 'embed' | 'bookmark';

/** A link the slash menu asked for, to place as an embed or a bookmark at the line the slash was typed on. */
export type LinkRequest = { readonly kind: LinkKind; readonly at: SuggestionRange };

type Store = { request: LinkRequest | null; readonly listeners: Set<() => void> };

const stores = new WeakMap<ViewController, Store>();

function storeOf(controller: ViewController): Store {
  let store = stores.get(controller);
  if (store === undefined) {
    store = { request: null, listeners: new Set() };
    stores.set(controller, store);
  }
  return store;
}

export function requestLink(controller: ViewController, request: LinkRequest | null): void {
  const store = storeOf(controller);
  if (store.request === request) return;
  store.request = request;
  for (const listener of [...store.listeners]) listener();
}

export function useLinkRequest(controller: ViewController): LinkRequest | null {
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
