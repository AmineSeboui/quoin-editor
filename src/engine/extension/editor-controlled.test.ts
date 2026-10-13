import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../model/quoin-block';
import { caret, md, startEditor } from '../test-support/editor-fixtures';

const typed = (blocks: QuoinBlock[], text = '1') => {
  const started = startEditor(blocks);
  started.editor.commands.setSelection(caret(blocks[0].id, 1));
  started.editor.insertText(text);
  return started;
};

describe('the controlled contract', () => {
  it('ignores every lagging echo, in order or not', () => {
    const { editor, onChange } = startEditor([md('a', 'x')]);
    editor.commands.setSelection(caret('a', 1));
    editor.insertText('1');
    editor.insertText('2');
    const [first, second] = onChange.mock.calls.map((call) => call[0]);
    expect(editor.setBlocks(first)).toBe(false);
    expect(editor.setBlocks(second)).toBe(false);
    expect(editor.getBlocks()).toEqual([md('a', 'x12')]);
  });

  it('treats an older emission arriving after catching up as a document load', () => {
    const { editor, onChange } = startEditor([md('a', 'x')]);
    editor.commands.setSelection(caret('a', 1));
    editor.insertText('1');
    editor.insertText('2');
    const [first, second] = onChange.mock.calls.map((call) => call[0]);
    expect(editor.setBlocks(second)).toBe(false);
    expect(editor.setBlocks(first)).toBe(true);
    expect(editor.getBlocks()).toEqual([md('a', 'x1')]);
  });

  it('loads the constructor array back without touching the document', () => {
    const blocks = [md('a', 'x')];
    const { editor, onChange } = startEditor(blocks);
    expect(editor.setBlocks(blocks)).toBe(false);
    expect(editor.setBlocks([md('a', 'x')])).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('records an echo as the last supplied array, so returning to the first one is a load', () => {
    const blocks = [md('a', 'x')];
    const { editor, onChange } = typed(blocks);
    expect(editor.setBlocks(onChange.mock.calls[0][0])).toBe(false);
    expect(editor.setBlocks([md('a', 'x')])).toBe(true);
    expect(editor.getBlocks()).toEqual([md('a', 'x')]);
  });

  it('keeps the engine blocks of identical QuoinBlock objects when reconciling', () => {
    const { editor, onChange } = typed([md('a', 'x'), md('b', 'two')]);
    const emitted: QuoinBlock[] = onChange.mock.calls[0][0];
    const before = editor.state.doc.blocks;
    expect(editor.setBlocks([...emitted, md('c', 'three')])).toBe(true);
    const after = editor.state.doc.blocks;
    expect(after.slice(0, 2)).toEqual(before);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
  });

  it('clears history, does not record the load and emits the new document', () => {
    const { editor, onChange } = typed([md('a', 'x')]);
    expect(editor.can().undo()).toBe(true);
    onChange.mockClear();
    expect(editor.setBlocks([md('a', 'other')])).toBe(true);
    expect(editor.can().undo()).toBe(false);
    expect(editor.can().redo()).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual([md('a', 'other')]);
    expect(editor.setBlocks(onChange.mock.calls[0][0])).toBe(false);
  });

  it('marks the reconcile transaction with its origin and keeps it out of the history', () => {
    const seen: Array<{ origin: string; addToHistory: boolean }> = [];
    const { editor } = startEditor([md('a', 'x')], {
      onTransaction: (tr) => seen.push({ origin: tr.origin, addToHistory: tr.addToHistory }),
    });
    editor.setBlocks([md('b', 'y')]);
    expect(seen).toEqual([{ origin: 'reconcile', addToHistory: false }]);
  });

  it('moves the selection to the first block when its block is gone', () => {
    const { editor } = typed([md('a', 'x')]);
    editor.setBlocks([md('b', 'y'), md('c', 'z')]);
    expect(editor.state.selection).toMatchObject({ kind: 'text', head: { block: 'b', offset: 0 } });
  });

  it('loads blocks with repeated ids under fresh ids', () => {
    const { editor } = startEditor([md('a', 'x')]);
    editor.setBlocks([md('p', 'one'), md('p', 'two')]);
    const ids = editor.state.doc.blocks.map((block) => block.id);
    expect(new Set(ids).size).toBe(2);
    expect(editor.getBlocks().map((block) => block.data.markdown)).toEqual(['one', 'two']);
  });

  it('reuses one array for getBlocks until the document changes', () => {
    const { editor } = startEditor([md('a', 'x')]);
    expect(editor.getBlocks()).toBe(editor.getBlocks());
  });

  it('hands the emitted array back from getBlocks, so returning it is an echo', () => {
    const { editor, onChange } = typed([md('a', 'x')]);
    expect(editor.getBlocks()).toBe(onChange.mock.calls[0][0]);
  });
});
