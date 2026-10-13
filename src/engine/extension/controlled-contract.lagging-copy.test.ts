import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../model/quoin-block';
import { caret, key, md, startEditor } from '../test-support/editor-fixtures';

function cloningHost() {
  const copies: QuoinBlock[][] = [];
  const started = startEditor([md('a', 'x')], { onChange: (blocks) => copies.push(structuredClone(blocks)) });
  started.editor.commands.setSelection(caret('a', 1));
  return { ...started, copies };
}

describe('a host that clones each emission and applies it late', () => {
  it('keeps the typed text and the history when the copy arrives one keystroke late', () => {
    const { editor, copies } = cloningHost();
    editor.insertText('1');
    editor.insertText('2');
    expect(editor.setBlocks(copies[0])).toBe(false);
    expect(editor.getBlocks()).toEqual([md('a', 'x12')]);
    expect(editor.can().undo()).toBe(true);
    expect(editor.setBlocks(copies[1])).toBe(false);
    expect(editor.getBlocks()).toEqual([md('a', 'x12')]);
  });

  it('acknowledges the oldest matching emission, so a copy lagging across a Backspace is not reloaded', () => {
    const { editor, copies } = cloningHost();
    editor.insertText('1');
    editor.insertText('2');
    editor.handleKey(key('Backspace'));
    expect(copies.map((copy) => copy[0].data.markdown)).toEqual(['x1', 'x12', 'x1']);
    for (const copy of copies) expect(editor.setBlocks(copy)).toBe(false);
    expect(editor.getBlocks()).toEqual([md('a', 'x1')]);
    expect(editor.can().undo()).toBe(true);
  });

  it('treats a copy of an emission the host has moved past as a load', () => {
    const { editor, copies } = cloningHost();
    editor.insertText('1');
    editor.insertText('2');
    expect(editor.setBlocks(copies[1])).toBe(false);
    expect(editor.setBlocks(copies[0])).toBe(true);
    expect(editor.getBlocks()).toEqual([md('a', 'x1')]);
  });
});
