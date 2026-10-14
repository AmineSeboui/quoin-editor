import type { Editor, Transaction } from '../../engine';
import { deleteSelection } from '../../engine/commands/delete-commands';
import { insertText } from '../../engine/commands/insert-text';
import { textSelection } from '../../engine/state/selection';
import type { ModelRange } from './target-range';

// Dispatches straight to the editor, so callers run it inside ViewController.edit to get the hosts re-rendered.
export function replaceRange(editor: Editor, range: ModelRange, text: string, withRules: boolean): boolean {
  const dispatch = (tr: Transaction) => editor.dispatch(tr);
  dispatch(editor.createTransaction().setSelection(textSelection(range.from, range.to)).setOrigin('input'));
  if (text === '') return deleteSelection(editor.state, (tr) => dispatch(tr.setOrigin('input')));
  return withRules ? editor.insertText(text) : insertText(text)(editor.state, dispatch);
}
