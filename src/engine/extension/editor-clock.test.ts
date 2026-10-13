import { describe, expect, it } from 'vitest';
import { caret, md, startEditor } from '../test-support/editor-fixtures';

describe('the injected clock', () => {
  it('groups typing by its time, so 10 s between two keystrokes makes two undo steps', () => {
    let time = 0;
    const { editor } = startEditor([md('a', 'x')], { now: () => time });
    editor.commands.setSelection(caret('a', 1));
    editor.insertText('1');
    time = 10_000;
    editor.insertText('2');
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getBlocks()).toEqual([md('a', 'x1')]);
  });

  it('stamps the transactions of commands, chains, undo and reconcile', () => {
    const times: number[] = [];
    const { editor } = startEditor([md('a', 'x')], { now: () => 4321, onTransaction: (tr) => times.push(tr.time) });
    editor.commands.setSelection(caret('a', 1));
    editor.insertText('1');
    editor.chain().insertText('2').insertText('3').run();
    editor.commands.undo();
    editor.setBlocks([md('b', 'y')]);
    expect(times).toEqual([4321, 4321, 4321, 4321, 4321]);
  });
});
