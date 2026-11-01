import type { Editor, Transaction } from '../../engine';
import { foreignOrigins } from '../../engine/state/transaction';

export type Engagement = {
  readonly engaged: boolean;
  engage(): void;
  subscribe(listener: () => void): () => void;
};

const chosenHere = (tr: Transaction | null): boolean =>
  tr !== null && tr.selectionSet && !foreignOrigins.includes(tr.origin);

/**
 * Whether anyone has acted on the editor yet: the reader by moving focus into it or a menu it portals out, or the reader
 * or the host by setting a selection. Until then the selection is only where a new or reloaded document starts, which
 * is a block selected as a whole when the first block has no text, so nothing draws or announces it.
 */
export function createEngagement(editor: Editor): Engagement {
  let engaged = false;
  const listeners = new Set<() => void>();
  function engage(): void {
    if (engaged) return;
    engaged = true;
    for (const listener of [...listeners]) listener();
  }
  editor.subscribe((_, tr) => {
    if (chosenHere(tr)) engage();
  });
  return {
    get engaged() {
      return engaged;
    },
    engage,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
