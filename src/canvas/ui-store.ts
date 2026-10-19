import { createContext, useContext, useSyncExternalStore } from 'react';

export type BlockMenuState = {
  blockIds: string[];
  /** The blocks the menu's style rows change, which leave out the unselected blocks nested under the menu's block. */
  styleIds: string[];
  anchor: 'handle' | 'pointer';
  x?: number;
  y?: number;
};

export type CanvasUiState = {
  hoveredBlock: string | null;
  blockMenu: BlockMenuState | null;
  drag: { blockIds: string[]; targetIndex: number; targetIndent: number } | null;
  linkPopover: { open: boolean };
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
};

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

/** The selector must return a value already in the state, or a primitive: a new object each read never settles. */
export function useCanvasUi<T>(store: CanvasUiStore, selector: (state: CanvasUiState) => T): T {
  const read = () => selector(store.get());
  return useSyncExternalStore(store.subscribe, read, read);
}

const CanvasUiContext = createContext<CanvasUiStore | null>(null);

/** Hands the canvas's UI store to the overlays its extensions draw. */
export const CanvasUiProvider = CanvasUiContext.Provider;

export function useCanvasUiStore(): CanvasUiStore {
  const store = useContext(CanvasUiContext);
  if (store === null) throw new Error('useCanvasUiStore must be used inside a BlockCanvas.');
  return store;
}
