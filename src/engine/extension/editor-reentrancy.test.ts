import { describe, expect, it } from 'vitest';
import { inlineText } from '../model/inline';
import type { EditorState } from '../state/editor-state';
import type { Transaction } from '../state/transaction';
import { caret, md, startEditor } from '../test-support/editor-fixtures';

const textOf = (state: EditorState) => inlineText(state.doc.blocks[0].regions.text);

function typingEditor() {
  const seen: string[] = [];
  const record = (who: string) => (state: EditorState, tr: Transaction | null) =>
    seen.push(`${who} ${textOf(state)} ${tr?.doc === state.doc ? 'paired' : 'unpaired'}`);
  const started = startEditor([md('a', 'x')], {
    onTransaction: (tr, state) => record('hook')(state, tr),
    onChange: (blocks) => seen.push(`change ${blocks[0].data.markdown}`),
  });
  started.editor.commands.setSelection(caret('a', 1));
  seen.length = 0;
  return { ...started, seen, record };
}

describe('a dispatch made while the editor notifies a transaction', () => {
  it('runs after every listener, hook and onChange saw the current transaction with its own state', () => {
    const { editor, seen, record } = typingEditor();
    let reacted = false;
    editor.subscribe((state, tr) => {
      record('first')(state, tr);
      if (!reacted) {
        reacted = true;
        expect(editor.commands.insertText('2')).toBe(true);
      }
    });
    editor.subscribe(record('second'));
    editor.insertText('1');
    expect(seen).toEqual([
      'first x1 paired',
      'second x1 paired',
      'hook x1 paired',
      'change x1',
      'first x12 paired',
      'second x12 paired',
      'hook x12 paired',
      'change x12',
    ]);
    expect(editor.getBlocks()).toEqual([md('a', 'x12')]);
  });

  it('refuses a second dispatch in the same round, since it was built on a state about to change', () => {
    const { editor } = typingEditor();
    const errors: unknown[] = [];
    let round = 0;
    editor.subscribe(() => {
      if (round++ > 0) return;
      editor.commands.insertText('2');
      try {
        editor.commands.insertText('3');
      } catch (error) {
        errors.push(error);
      }
    });
    editor.insertText('1');
    expect(errors).toEqual([new RangeError('Applying a mismatched transaction: it was built on another state')]);
    expect(editor.getBlocks()).toEqual([md('a', 'x12')]);
  });
});
