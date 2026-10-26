import type { CommandFactories } from '../commands/chain';
import type { Editor } from '../extension/editor';
import type { Selection } from '../model/types';
import { sameSelection, validateSelection } from '../state/selection';
import type { Transaction, TransactionOrigin } from '../state/transaction';
import type { Step } from '../transform/step';

/**
 * Changes the shared document already holds, as one transaction of `origin` kept out of the history. The local
 * selection is carried through them unless `selectionHint` is given and fits the new document.
 */
export function sharedChange(
  editor: Editor<CommandFactories>,
  steps: readonly Step[],
  selectionHint?: Selection | null,
  origin: TransactionOrigin = 'remote',
): Transaction {
  const tr = editor.createTransaction().setOrigin(origin).setMeta('addToHistory', false);
  for (const step of steps) tr.step(step);
  if (selectionHint && sameSelection(validateSelection(tr.doc, editor.schema, selectionHint), selectionHint)) {
    tr.setSelection(selectionHint);
  }
  return tr;
}

/**
 * Applies changes made elsewhere as one remote transaction, kept out of the history. The local selection is carried
 * through them unless `selectionHint` is given and fits the new document.
 */
export function applyRemote(
  editor: Editor<CommandFactories>,
  steps: readonly Step[],
  selectionHint?: Selection | null,
): void {
  editor.dispatch(sharedChange(editor, steps, selectionHint));
}
