import type { CommandFactories } from '../commands/chain';
import type { Editor } from '../extension/editor';
import type { Selection } from '../model/types';
import { sameSelection, validateSelection } from '../state/selection';
import type { Step } from '../transform/step';

/**
 * Applies changes made elsewhere as one remote transaction, kept out of the history. The local selection is carried
 * through them unless `selectionHint` is given and fits the new document.
 */
export function applyRemote(
  editor: Editor<CommandFactories>,
  steps: readonly Step[],
  selectionHint?: Selection | null,
): void {
  const tr = editor.createTransaction().setOrigin('remote').setMeta('addToHistory', false);
  for (const step of steps) tr.step(step);
  if (selectionHint && sameSelection(validateSelection(tr.doc, editor.schema, selectionHint), selectionHint)) {
    tr.setSelection(selectionHint);
  }
  editor.dispatch(tr);
}
