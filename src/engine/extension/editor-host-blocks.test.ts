import { describe, expect, it, vi } from 'vitest';
import { coreExtensions } from './core-extensions';
import { defineExtension } from './define-extension';
import { caret, md, startEditor } from '../test-support/editor-fixtures';

const holding = (filterHostBlocks: () => boolean) => [
  ...coreExtensions(),
  defineExtension({ name: 'hold', filterHostBlocks }),
];

describe('an extension that refuses the blocks the host supplies', () => {
  it('leaves the document as it is and reports nothing applied', () => {
    const filter = vi.fn(() => false);
    const { editor, onChange } = startEditor([md('a', 'x')], { extensions: holding(filter) });
    expect(editor.setBlocks([md('b', 'other')])).toBe(false);
    expect(editor.getBlocks()).toEqual([md('a', 'x')]);
    expect(onChange).not.toHaveBeenCalled();
    expect(filter).toHaveBeenCalledWith([md('b', 'other')]);
  });

  it('is not asked about the blocks the editor emitted or already holds', () => {
    const filter = vi.fn(() => false);
    const { editor, onChange } = startEditor([md('a', 'x')], { extensions: holding(filter) });
    editor.commands.setSelection(caret('a', 1));
    editor.insertText('y');
    editor.setBlocks(onChange.mock.calls[0][0]);
    editor.setBlocks([md('a', 'xy')]);
    expect(filter).not.toHaveBeenCalled();
  });

  it('lets them through by returning true', () => {
    const { editor } = startEditor([md('a', 'x')], { extensions: holding(() => true) });
    expect(editor.setBlocks([md('b', 'other')])).toBe(true);
    expect(editor.getBlocks()).toEqual([md('b', 'other')]);
  });
});
