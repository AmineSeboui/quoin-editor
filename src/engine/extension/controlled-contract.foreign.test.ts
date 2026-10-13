import { describe, expect, it } from 'vitest';
import { caret, md, startEditor } from '../test-support/editor-fixtures';

function typed() {
  const started = startEditor([md('a', 'x')]);
  started.editor.commands.setSelection(caret('a', 1));
  started.editor.insertText('1');
  started.onChange.mockClear();
  return started;
}

describe('a foreign document', () => {
  it('replaces the document and clears the history without emitting the host its own blocks', () => {
    const { editor, onChange } = typed();
    const loaded = [md('b', 'from the server')];
    expect(editor.setBlocks(loaded)).toBe(true);
    expect(editor.getBlocks()).toEqual(loaded);
    expect(editor.can().undo()).toBe(false);
    expect(editor.can().redo()).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('emits the document when the codec had to change it, and takes that emission back as an echo', () => {
    const { editor, onChange } = typed();
    expect(editor.setBlocks([md('p', 'one'), md('p', 'two')])).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    const [emitted] = onChange.mock.calls[0];
    expect(emitted.map((block: { id: string }) => block.id)).toEqual(['p', 'n1']);
    expect(editor.setBlocks(structuredClone(emitted))).toBe(false);
  });

  it('treats an emission from before the load as a load of its own', () => {
    const { editor } = typed();
    const [early] = [editor.getBlocks()];
    expect(editor.setBlocks([md('b', 'loaded')])).toBe(true);
    expect(editor.setBlocks(structuredClone(early))).toBe(true);
    expect(editor.getBlocks()).toEqual([md('a', 'x1')]);
  });
});
