import { useSyncExternalStore } from 'react';

export type BlockMenuState = { blockIds: string[]; anchor: 'handle' | 'pointer'; x?: number; y?: number };

export type CanvasUiState = {
  hoveredBlock: string | null;
  blockMenu: BlockMenuState | null;
  drag: { blockIds: string[]; targetIndex: number; targetIndent: number } | null;
  linkPopover: { open: boolean };
  slashOpen: boolean;
};

export type CanvasUiStore = {
  get(): CanvasUiState;
  set(patch: Partial<CanvasUiState>): void;
  subscribe(listener: () => void): () => void;
};

const INITIAL: CanvasUiState = {
  hoveredBlock: null,
  blockMenu: null,
  drag: null,
  linkPopover: { open: false },
  slashOpen: false,
};

/** The UI state of one canvas that lives outside the document: what the pointer is over and which overlay is open. */
export function createCanvasUiStore(): CanvasUiStore {
  let state = INITIAL;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      const keys = Object.keys(patch) as (keyof CanvasUiState)[];
      if (keys.every((key) => Object.is(state[key], patch[key]))) return;
      state = { ...state, ...patch };
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

/** Reads a slice of the canvas UI state. The selector must return a value already in the state, or a primitive. */
export function useCanvasUi<T>(store: CanvasUiStore, selector: (state: CanvasUiState) => T): T {
  const read = () => selector(store.get());
  return useSyncExternalStore(store.subscribe, read, read);
}
