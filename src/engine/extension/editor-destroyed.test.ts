import { describe, expect, it, vi } from 'vitest';
import { caret, key, md, startEditor } from '../test-support/editor-fixtures';

function destroyedEditor() {
  const started = startEditor([md('a', 'x')]);
  started.editor.commands.setSelection(caret('a', 1));
  const listener = vi.fn();
  started.editor.subscribe(listener);
  started.editor.destroy();
  return { ...started, listener };
}

describe('a destroyed editor', () => {
  it('refuses every edit and says so', () => {
    const { editor, onChange, listener } = destroyedEditor();
    expect(editor.insertText('!')).toBe(false);
    expect(editor.handleKey(key('Enter'))).toBe(false);
    expect(editor.setBlocks([md('z', 'other')])).toBe(false);
    expect(editor.paste({ text: 'pasted' })).toBe(false);
    expect(editor.commands.insertText('!')).toBe(false);
    expect(editor.chain().insertText('!').run()).toBe(false);
    expect(editor.can().insertText('!')).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(editor.getBlocks()).toEqual([md('a', 'x')]);
  });

  it('throws when handed a transaction', () => {
    const { editor } = destroyedEditor();
    const tr = editor.createTransaction();
    expect(() => editor.dispatch(tr)).toThrow(new Error('Cannot dispatch to a destroyed editor'));
  });
});
