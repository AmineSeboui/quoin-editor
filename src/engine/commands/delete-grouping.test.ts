import { describe, expect, it } from 'vitest';
import { inlineText } from '../model/inline';
import { undoDepth } from '../state/history';
import { caret, key, md, startEditor } from '../test-support/editor-fixtures';

const textOf = (editor: ReturnType<typeof startEditor>['editor']) => editor.getBlocks().map((block) => block.data.markdown);

describe('undo grouping of deletions', () => {
  it('makes five Backspaces at the end of a word one undo item', () => {
    const { editor } = startEditor([md('a', 'hello')]);
    editor.commands.setSelection(caret('a', 5));
    for (let i = 0; i < 5; i++) editor.handleKey(key('Backspace'));
    expect(textOf(editor)).toEqual(['']);
    expect(undoDepth(editor.state)).toBe(1);
    editor.commands.undo();
    expect(textOf(editor)).toEqual(['hello']);
    expect(editor.state.selection).toMatchObject({ head: { offset: 5 } });
  });

  it('groups Delete, word deletes and line deletes the same way', () => {
    const forward = startEditor([md('a', 'hello')]);
    forward.editor.commands.setSelection(caret('a', 0));
    for (let i = 0; i < 3; i++) forward.editor.handleKey(key('Delete'));
    expect(undoDepth(forward.editor.state)).toBe(1);

    const words = startEditor([md('a', 'one two three')]);
    words.editor.commands.setSelection(caret('a', 13));
    words.editor.commands.deleteWordBackward();
    words.editor.commands.deleteWordBackward();
    expect(inlineText(words.editor.state.doc.blocks[0].regions.text)).toBe('one ');
    expect(undoDepth(words.editor.state)).toBe(1);

    const lines = startEditor([md('a', 'one\\\ntwo')]);
    lines.editor.commands.setSelection(caret('a', 7));
    lines.editor.commands.deleteToLineStart();
    lines.editor.commands.deleteBackward();
    expect(undoDepth(lines.editor.state)).toBe(1);
  });

  it('follows the 500 ms rule between Backspace, typing and Backspace', () => {
    let time = 0;
    const { editor } = startEditor([md('a', 'hello')], { now: () => time });
    editor.commands.setSelection(caret('a', 5));
    editor.handleKey(key('Backspace'));
    time = 100;
    editor.insertText('!');
    time = 200;
    editor.handleKey(key('Backspace'));
    expect(textOf(editor)).toEqual(['hell']);
    expect(undoDepth(editor.state)).toBe(1);
    time = 1_000;
    editor.handleKey(key('Backspace'));
    expect(undoDepth(editor.state)).toBe(2);
    editor.commands.undo();
    expect(textOf(editor)).toEqual(['hell']);
  });

  it('keeps a deletion that crosses a block boundary as its own item', () => {
    const { editor } = startEditor([md('a', 'ab'), md('b', 'cd')]);
    editor.commands.setSelection(caret('b', 1));
    editor.handleKey(key('Backspace'));
    editor.handleKey(key('Backspace'));
    expect(textOf(editor)).toEqual(['abd']);
    editor.handleKey(key('Backspace'));
    expect(textOf(editor)).toEqual(['ad']);
    expect(undoDepth(editor.state)).toBe(3);
    editor.commands.undo();
    expect(textOf(editor)).toEqual(['abd']);
    editor.commands.undo();
    expect(textOf(editor)).toEqual(['ab', 'd']);
  });

  it('does not group the deletion of a selected range with the typing around it', () => {
    const { editor } = startEditor([md('a', 'hello')]);
    editor.commands.setSelection({ ...caret('a', 0), head: { block: 'a', region: 'text', offset: 3 } });
    editor.handleKey(key('Backspace'));
    editor.insertText('x');
    expect(undoDepth(editor.state)).toBe(2);
  });
});
