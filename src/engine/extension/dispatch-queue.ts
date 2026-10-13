import { mismatchedTransaction, type EditorState } from '../state/editor-state';
import type { Transaction } from '../state/transaction';

export type DispatchQueue = { dispatch(tr: Transaction): void; clear(): void };

/**
 * Commits transactions one at a time. One dispatched while another is being committed, from a listener or a hook,
 * waits until that commit has notified everyone, so every notification pairs a transaction with the state it
 * produced. One waits at a time: a second would be built on a state the first is about to replace.
 */
export function createDispatchQueue(current: () => EditorState, commit: (tr: Transaction) => void): DispatchQueue {
  const accepted = new WeakSet<Transaction>();
  let waiting: Transaction | null = null;
  let committing = false;

  function dispatch(tr: Transaction): void {
    if (accepted.has(tr)) throw new RangeError('This transaction was already dispatched');
    if (tr.before !== current() || waiting !== null) throw mismatchedTransaction();
    accepted.add(tr);
    if (committing) {
      waiting = tr;
      return;
    }
    committing = true;
    try {
      for (let next: Transaction | null = tr; next !== null; next = waiting) {
        waiting = null;
        commit(next);
      }
    } finally {
      committing = false;
      waiting = null;
    }
  }

  return {
    dispatch,
    clear() {
      waiting = null;
    },
  };
}
