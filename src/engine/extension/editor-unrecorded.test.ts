import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import { undoDepth } from '../state/history';
import { caret, md, startEditor } from '../test-support/editor-fixtures';
import { replaceInlineStep } from '../transform/replace-inline-step';
import type { Editor } from './editor';

const remote = (editor: Editor, block: string, from: number, to: number, inserted: string) =>
  editor.dispatch(
    editor
      .createTransaction()
      .setOrigin('remote')
      .step(replaceInlineStep(block, 'text', from, to, inserted === '' ? [] : [text(inserted)])),
  );

describe('history across a document change it did not record', () => {
  it('does not undo a stale step after a remote insert before the typed text', () => {
    const { editor } = startEditor([md('a', 'hello')]);
    editor.commands.setSelection(caret('a', 5));
    editor.insertText('!');
    remote(editor, 'a', 0, 0, 'XY');
    expect(editor.commands.undo()).toBe(false);
    expect(editor.getBlocks()).toEqual([md('a', 'XYhello!')]);
  });

  it('leaves no item stuck on top after a remote change removes what it would undo', () => {
    const { editor } = startEditor([md('a', 'hello'), md('b', 'x')]);
    editor.commands.setSelection(caret('a', 5));
    editor.insertText('!');
    editor.commands.setSelection(caret('b', 1));
    editor.insertText('?');
    remote(editor, 'b', 0, 2, '');
    expect(undoDepth(editor.state)).toBe(0);
    expect([editor.commands.undo(), editor.commands.undo()]).toEqual([false, false]);
    editor.insertText('z');
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getBlocks()).toEqual([md('a', 'hello!'), md('b', '')]);
  });
});
