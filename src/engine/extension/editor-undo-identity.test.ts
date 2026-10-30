import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../model/quoin-block';
import { caret, key, md, startEditor } from '../test-support/editor-fixtures';

describe('undo gives back the stored block objects', () => {
  it('returns the host object of a block written in a legacy form', () => {
    const old = md('a', '*old style*');
    const other = md('b', 'other');
    const { editor, onChange } = startEditor([old, other]);
    editor.commands.setSelection(caret('a', 1));
    editor.insertText('x');
    expect(editor.getBlocks()[0]).not.toBe(old);
    editor.commands.undo();
    expect(editor.getBlocks()[0]).toBe(old);
    const emitted: QuoinBlock[][] = onChange.mock.calls.map((call) => call[0]);
    expect(emitted[0][1]).toBe(emitted[1][1]);
    expect(emitted[1][0]).toBe(old);
  });

  it('returns an intact legacy group as the original object', () => {
    const legacy = { id: 'g', type: 'MARKDOWN', data: { markdown: '# Notes\n\n- one\n- two' } };
    const { editor } = startEditor([legacy]);
    editor.commands.setSelection(caret('g', 1));
    editor.insertText('x');
    editor.commands.undo();
    expect(editor.getBlocks()).toHaveLength(1);
    expect(editor.getBlocks()[0]).toBe(legacy);
  });

  it('returns the original object only when the indent matches again', () => {
    const second = md('b', '- b');
    const { editor } = startEditor([md('a', '- a'), second]);
    editor.commands.setSelection(caret('b', 1));
    editor.handleKey(key('Tab'));
    expect(editor.getBlocks()[1]).not.toBe(second);
    expect(editor.getBlocks()[1].indent).toBe(1);
    editor.handleKey(key('Tab', { shiftKey: true }));
    expect(editor.getBlocks()[1]).toBe(second);
  });

  it('returns the object last emitted for the content, then the host object', () => {
    let time = 0;
    const host = md('a', 'abc');
    const { editor, onChange } = startEditor([host], { now: () => time });
    editor.commands.setSelection(caret('a', 3));
    editor.insertText('d');
    const afterD = editor.getBlocks()[0];
    expect(afterD).toBe(onChange.mock.calls.at(-1)?.[0][0]);
    time = 10_000;
    editor.insertText('e');
    editor.commands.undo();
    expect(editor.getBlocks()[0]).toBe(afterD);
    editor.commands.undo();
    expect(editor.getBlocks()[0]).toBe(host);
  });
});
