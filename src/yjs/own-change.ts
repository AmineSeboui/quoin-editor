import type { CommandFactories } from '../engine/commands/chain';
import type { Editor } from '../engine/extension/editor';
import type { Selection } from '../engine/model/types';
import { sameSelection, validateSelection } from '../engine/state/selection';
import type { Transaction } from '../engine/state/transaction';
import type { Step } from '../engine/transform/step';

/** This client's own undo or redo, which the shared document already holds, as the editor's history change. */
export function ownChange(editor: Editor<CommandFactories>, steps: readonly Step[], hint: Selection | null): Transaction {
  const tr = editor.createTransaction().setOrigin('history').setMeta('addToHistory', false);
  for (const step of steps) tr.step(step);
  if (hint && sameSelection(validateSelection(tr.doc, editor.schema, hint), hint)) tr.setSelection(hint);
  return tr;
}
