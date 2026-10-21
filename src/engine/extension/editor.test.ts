import { describe, expect, it, vi } from 'vitest';
import { createEditor } from './editor';
import type { QuoinBlock } from '../model/quoin-block';

const start = (blocks: QuoinBlock[]) => {
  let n = 0;
  const onChange = vi.fn();
  const editor = createEditor({ blocks, onChange, newId: () => `n${++n}`, now: () => 0, isMac: true });
  return { editor, onChange };
};
const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });

describe('createEditor', () => {
  it('does not emit on creation and emits synchronously on change', () => {
    const blocks = [md('a', 'hi')];
    const { editor, onChange } = start(blocks);
    expect(onChange).not.toHaveBeenCalled();
    expect(editor.getBlocks()[0]).toBe(blocks[0]);
    editor.commands.setSelection({ kind: 'text', anchor: { block: 'a', region: 'text', offset: 2 }, head: { block: 'a', region: 'text', offset: 2 } });
    editor.insertText('!');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual([md('a', 'hi!')]);
  });

  it('applies markdown shortcuts and keyboard commands', () => {
    const { editor } = start([{ ...md('a', ''), data: { markdown: '' } }]);
    editor.insertText('#');
    editor.insertText(' ');
    editor.insertText('T');
    expect(editor.getBlocks()[0].data.markdown).toBe('# T');
    expect(editor.handleKey({ key: 'Enter', altKey: false, ctrlKey: false, metaKey: false, shiftKey: false })).toBe(true);
    expect(editor.getBlocks().map((b) => b.data.markdown)).toEqual(['# T', '']);
    expect(editor.handleKey({ key: 'z', altKey: false, ctrlKey: false, metaKey: true, shiftKey: false })).toBe(true);
    expect(editor.getBlocks().map((b) => b.data.markdown)).toEqual(['# T']);
  });

  it('ignores its own echoes and structurally equal arrays, and reconciles foreign documents', () => {
    const { editor, onChange } = start([md('a', 'x')]);
    editor.commands.setSelection({ kind: 'text', anchor: { block: 'a', region: 'text', offset: 1 }, head: { block: 'a', region: 'text', offset: 1 } });
    editor.insertText('1');
    const emitted = onChange.mock.calls[0][0];
    expect(editor.setBlocks(emitted)).toBe(false);
    expect(editor.setBlocks([md('a', 'x1')])).toBe(false);
    expect(editor.setBlocks([md('a', 'loaded'), md('b', 'two')])).toBe(true);
    expect(editor.getBlocks().map((b) => b.data.markdown)).toEqual(['loaded', 'two']);
    expect(editor.can().undo()).toBe(false);
    expect(editor.state.selection).toMatchObject({ kind: 'text', head: { block: 'a', offset: 6 } });
  });

  it('round trips copy and paste', () => {
    const { editor } = start([md('a', 'one **two**'), md('b', 'three')]);
    editor.commands.setSelection({ kind: 'text', anchor: { block: 'a', region: 'text', offset: 4 }, head: { block: 'a', region: 'text', offset: 7 } });
    const copied = editor.copy()!;
    editor.commands.setSelection({ kind: 'text', anchor: { block: 'b', region: 'text', offset: 5 }, head: { block: 'b', region: 'text', offset: 5 } });
    expect(editor.paste(copied)).toBe(true);
    expect(editor.getBlocks()[1].data.markdown).toBe('three**two**');
  });

  it('exposes chain, isActive and toMarkdown', () => {
    const { editor } = start([md('a', 'word')]);
    editor.commands.setSelection({ kind: 'text', anchor: { block: 'a', region: 'text', offset: 0 }, head: { block: 'a', region: 'text', offset: 4 } });
    expect(editor.chain().toggleMark('bold').toggleMark('italic').run()).toBe(true);
    expect(editor.isActive('bold')).toBe(true);
    expect(editor.toMarkdown()).toBe('**_word_**\n');
  });
});
