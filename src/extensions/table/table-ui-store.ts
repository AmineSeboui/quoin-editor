import { useCallback, useSyncExternalStore } from 'react';
import type { ViewController } from '../../view';

/** The widths a column drag shows before it is written, for the table it is over. */
export type WidthPreview = { readonly block: string; readonly widths: readonly number[] };

type TableUiState = { readonly preview: WidthPreview | null };

export type TableUiStore = {
  get(): TableUiState;
  set(patch: Partial<TableUiState>): void;
  subscribe(listener: () => void): () => void;
};

function createTableUiStore(): TableUiStore {
  let state: TableUiState = { preview: null };
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

const stores = new WeakMap<ViewController, TableUiStore>();

/** The table UI state of one canvas, shared by its tables and the controls drawn over them. */
export function tableUiStore(controller: ViewController): TableUiStore {
  let store = stores.get(controller);
  if (store === undefined) {
    store = createTableUiStore();
    stores.set(controller, store);
  }
  return store;
}

export function useWidthPreview(controller: ViewController, blockId: string): readonly number[] | null {
  const store = tableUiStore(controller);
  const read = useCallback(() => {
    const { preview } = store.get();
    return preview?.block === blockId ? preview.widths : null;
  }, [store, blockId]);
  return useSyncExternalStore(store.subscribe, read, read);
}
