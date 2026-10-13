import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import { undoDepth } from '../state/history';
import { caret, md, startEditor } from '../test-support/editor-fixtures';
import { replaceInlineStep } from '../transform/replace-inline-step';

describe('dispatching a transaction built on an older state', () => {
  it('throws for a transaction created before insertText and keeps the typed text', () => {
    const { editor, onChange } = startEditor([md('a', 'doc')]);
    editor.commands.setSelection(caret('a', 3));
    const stale = editor.createTransaction().step(replaceInlineStep('a', 'text', 0, 0, [text('>')]));
    editor.insertText('!');
    onChange.mockClear();
    expect(() => editor.dispatch(stale)).toThrow(RangeError);
    expect(editor.getBlocks()).toEqual([md('a', 'doc!')]);
    expect(onChange).not.toHaveBeenCalled();
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getBlocks()).toEqual([md('a', 'doc')]);
  });

  it('throws for a transaction created before setBlocks and keeps the loaded blocks', () => {
    const { editor } = startEditor([md('a', 'local')]);
    const stale = editor.createTransaction().step(replaceInlineStep('a', 'text', 5, 5, [text('!')]));
    editor.setBlocks([md('a', 'remote'), md('b', 'new')]);
    expect(() => editor.dispatch(stale)).toThrow('mismatched transaction');
    expect(editor.getBlocks()).toEqual([md('a', 'remote'), md('b', 'new')]);
  });

  it('throws for a transaction dispatched twice and applies it once', () => {
    const { editor, onChange } = startEditor([md('a', 'x')]);
    const tr = editor.createTransaction().step(replaceInlineStep('a', 'text', 1, 1, [text('!')]));
    editor.dispatch(tr);
    expect(() => editor.dispatch(tr)).toThrow(new RangeError('This transaction was already dispatched'));
    expect(editor.getBlocks()).toEqual([md('a', 'x!')]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(undoDepth(editor.state)).toBe(1);
  });

  it('still runs a chain whose commands build on the states in between', () => {
    const { editor } = startEditor([md('a', 'x')]);
    expect(editor.chain().setSelection(caret('a', 1)).insertText('1').insertText('2').run()).toBe(true);
    expect(editor.getBlocks()).toEqual([md('a', 'x12')]);
  });
});
