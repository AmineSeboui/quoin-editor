import type { Editor, Transaction } from '../../engine';
import { deleteSelection } from '../../engine/commands/delete-commands';
import { insertText } from '../../engine/commands/insert-text';
import { textSelection } from '../../engine/state/selection';
import type { ModelRange } from './target-range';

// Dispatches straight to the editor, so callers run it inside ViewController.edit to get the hosts re-rendered. The
// range is selected in a transaction of its own because history takes the selection before an edit as the one its
// undo brings back; an edit the editor refuses so has the selection put back as it was.
export function replaceRange(editor: Editor, range: ModelRange, text: string, withRules: boolean): boolean {
  const { doc, selection } = editor.state;
  const dispatch = (tr: Transaction) => editor.dispatch(tr.setOrigin('input'));
  dispatch(editor.createTransaction().setSelection(textSelection(range.from, range.to)));
  const replaced =
    text === ''
      ? deleteSelection(editor.state, dispatch)
      : withRules
        ? editor.insertText(text)
        : insertText(text, { origin: 'input' })(editor.state, dispatch);
  if (editor.state.doc === doc && selection !== null) dispatch(editor.createTransaction().setSelection(selection));
  return replaced;
}
