import { describe, expect, it } from 'vitest';
import { caret, md, startEditor } from '../test-support/editor-fixtures';

function typeAll(initial: string, typed: string, extra: string) {
  const { editor } = startEditor([md('a', initial)]);
  editor.commands.setSelection(caret('a', initial.length));
  for (const char of typed) editor.insertText(char);
  const before = editor.getBlocks()[0];
  editor.insertText(extra);
  return { editor, before };
}

describe('typing right after a mark shortcut', () => {
  it.each([
    ['', '**b**', '**b**z'],
    ['x ', '**b**', 'x **b**z'],
    ['ab ', '_it_', 'ab _it_z'],
  ])('undoes %j then %j and the next character in one step', (initial, typed) => {
    const { editor } = typeAll(initial, typed, 'z');
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getBlocks()[0]).toEqual(md('a', initial));
    expect(editor.can().undo()).toBe(false);
  });
});
