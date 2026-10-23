import { coreExtensions, insertText, type Editor } from '../../engine';
import { caret, key, md, range, startEditor } from '../../engine/test-support/editor-fixtures';
import { aiExtension } from './ai-extension';
import { noteFocus } from './ai-flow';
import { aiState } from './ai-plugin';
import { fakeAiHost } from './ai-test-host';

function writing(...lines: string[]) {
  const { editor } = startEditor(
    lines.map((line, i) => md(`p${i}`, line)),
    { extensions: [...coreExtensions(), aiExtension({ stream: fakeAiHost().stream })] },
  );
  editor.mount();
  return editor;
}

const space = (editor: Editor) => editor.handleKey(key(' '));
const type = (editor: Editor, typed: string) => insertText(typed)(editor.state, (tr) => editor.dispatch(tr));

describe('a Space on an empty line', () => {
  it('opens the AI menu about that line instead of typing', () => {
    const editor = writing('Text', '');
    editor.commands.setSelection(caret('p1', 0));
    expect(space(editor)).toBe(true);
    const point = { block: 'p1', region: 'text', offset: 0 };
    expect(aiState(editor.state)).toMatchObject({ menu: { fromSpace: true }, target: { from: point, to: point } });
  });

  it('types a space on a line with text, or one that has held text since the caret arrived', () => {
    const editor = writing('Text', '');
    editor.commands.setSelection(caret('p0', 4));
    expect(space(editor)).toBe(false);
    editor.commands.setSelection(caret('p1', 0));
    type(editor, 'a');
    editor.commands.deleteBackward();
    expect(editor.getBlocks()[1].data.markdown).toBe('');
    expect(space(editor)).toBe(false);
    expect(aiState(editor.state).menu).toBeNull();
  });

  it('opens again once the caret has moved to another empty line', () => {
    const editor = writing('', '');
    editor.commands.setSelection(caret('p0', 0));
    type(editor, 'a');
    editor.commands.deleteBackward();
    editor.commands.setSelection(caret('p1', 0));
    expect(space(editor)).toBe(true);
  });

  it('types a space on an empty heading or list item, and while an answer or the menu is shown', () => {
    const editor = writing('# ', '- ', '', '');
    editor.commands.setSelection(caret('p0', 0));
    expect(space(editor)).toBe(false);
    editor.commands.setSelection(caret('p1', 0));
    expect(space(editor)).toBe(false);
    editor.commands.setSelection(caret('p2', 0));
    expect(space(editor)).toBe(true);
    editor.commands.setSelection(caret('p3', 0));
    expect(space(editor)).toBe(false);
  });

  it('types a space on a line cleared in one change', () => {
    const editor = writing('Text', 'Gone');
    editor.commands.setSelection(range('p1', 0, 4));
    editor.commands.deleteBackward();
    expect(editor.getBlocks()[1].data.markdown).toBe('');
    expect(space(editor)).toBe(false);
  });

  it('types a space on a line typed in, emptied, left and returned to, until focus arrives again', () => {
    const editor = writing('Text', '');
    editor.commands.setSelection(caret('p1', 0));
    type(editor, 'ab');
    editor.commands.deleteBackward();
    editor.commands.deleteBackward();
    editor.commands.setSelection(caret('p0', 2));
    editor.commands.setSelection(caret('p1', 0));
    expect(space(editor)).toBe(false);
    noteFocus(editor);
    expect(space(editor)).toBe(true);
  });
});
