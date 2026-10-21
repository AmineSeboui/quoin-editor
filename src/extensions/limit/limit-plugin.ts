import type { EditorState, Transaction } from '../../engine';
import { countWriting } from '../stats/count-writing';

type Refused = (state: EditorState, tr: Transaction) => void;

export type Limit = {
  filterTransaction(tr: Transaction, state: EditorState): boolean;
  /** Calls `listener` with the state an edit was refused in; returns the means to stop. */
  onRefused(listener: Refused): () => void;
};

const characters = (state: EditorState, doc = state.doc) => countWriting(doc, state.schema).characters;

/**
 * Refuses an edit that leaves the document with more than `limit` characters, as `countWriting` counts them, and more
 * than it had, so a deletion always goes through and a document loaded over the limit can still be edited down.
 */
export function createLimit(limit: number): Limit {
  const listeners = new Set<Refused>();
  return {
    filterTransaction(tr, state) {
      if (!tr.docChanged) return true;
      const after = characters(state, tr.doc);
      if (after <= limit || after <= characters(state)) return true;
      for (const listener of [...listeners]) listener(state, tr);
      return false;
    },
    onRefused(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
