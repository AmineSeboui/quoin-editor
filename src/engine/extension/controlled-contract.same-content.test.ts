import { describe, expect, it } from 'vitest';
import { caret, md, range, startEditor } from '../test-support/editor-fixtures';

function typedAndSelected() {
  const started = startEditor([md('a', 'x **b**')]);
  started.editor.commands.setSelection(caret('a', 3));
  started.editor.insertText('1');
  started.editor.setBlocks(started.onChange.mock.calls[0][0]);
  started.editor.commands.setSelection(range('a', 0, 2));
  started.onChange.mockClear();
  return started;
}

describe('a load equal to the current content', () => {
  it('leaves the state, history and selection alone for a structural copy', () => {
    const { editor, onChange } = typedAndSelected();
    const before = editor.state;
    expect(editor.setBlocks(structuredClone(editor.getBlocks()))).toBe(false);
    expect(editor.state).toBe(before);
    expect(editor.can().undo()).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('leaves them alone for blocks that spell the same content differently', () => {
    const { editor, onChange } = typedAndSelected();
    const before = editor.state;
    expect(editor.getBlocks()).toEqual([md('a', 'x **b1**')]);
    expect(editor.setBlocks([md('a', 'x __b1__')])).toBe(false);
    expect(editor.state).toBe(before);
    expect(editor.can().undo()).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });
});
