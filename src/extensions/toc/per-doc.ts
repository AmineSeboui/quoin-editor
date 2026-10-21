import type { EditorState, EngineDoc } from '../../engine';

/** Reads the state once for each document, so a transaction that moves only the selection costs nothing. */
export function perDoc<T>(read: (state: EditorState) => T): (state: EditorState) => T {
  const cache = new WeakMap<EngineDoc, T>();
  return (state) => {
    if (!cache.has(state.doc)) cache.set(state.doc, read(state));
    return cache.get(state.doc) as T;
  };
}
