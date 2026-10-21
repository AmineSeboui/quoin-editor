import { coreExtensions, defineExtension, typographyRules, type EditorState } from '../../engine';
import { caret, key, md, range, startEditor } from '../../engine/test-support/editor-fixtures';
import { createLimit } from './limit-plugin';

function limited(markdown: string, limit: number, typography = false) {
  const guard = createLimit(limit);
  const refused: EditorState[] = [];
  guard.onRefused((state) => refused.push(state));
  const extension = defineExtension({
    name: 'limit',
    filterTransaction: guard.filterTransaction,
    ...(typography && { inputRules: typographyRules() }),
  });
  const started = startEditor([md('a', markdown)], { extensions: [...coreExtensions(), extension] });
  const text = () => started.editor.getBlocks()[0].data.markdown;
  return { ...started, text, refused };
}

describe('a character limit', () => {
  it('refuses a paste that would overflow it, whole, and lets a deletion through', () => {
    const { editor, text, refused } = limited('abcdef', 10);
    editor.commands.setSelection(caret('a', 6));
    const before = editor.state;
    expect(editor.paste({ text: 'ghijk' })).toBe(true);
    expect(text()).toBe('abcdef');
    expect(refused).toEqual([before]);
    editor.paste({ text: 'ghij' });
    expect(text()).toBe('abcdefghij');
    editor.handleKey(key('Backspace'));
    expect(text()).toBe('abcdefghi');
    expect(refused).toHaveLength(1);
  });

  it('takes typing up to the limit and refuses the character past it', () => {
    const { editor, text, refused } = limited('abc', 4);
    editor.commands.setSelection(caret('a', 3));
    editor.insertText('d');
    editor.insertText('e');
    expect(text()).toBe('abcd');
    expect(refused).toHaveLength(1);
  });

  it('lets a document loaded over the limit be edited down, or changed without growing', () => {
    const { editor, text, refused } = limited('abcdef', 3);
    editor.commands.setSelection(range('a', 0, 1));
    editor.insertText('X');
    expect(text()).toBe('Xbcdef');
    editor.commands.setSelection(caret('a', 6));
    editor.insertText('g');
    expect(text()).toBe('Xbcdef');
    editor.handleKey(key('Backspace'));
    expect(text()).toBe('Xbcde');
    expect(refused).toHaveLength(1);
  });

  it('lets through what changes no text, and the blocks the host supplies', () => {
    const { editor, text, refused } = limited('abc', 3);
    editor.commands.setSelection(caret('a', 1));
    expect(editor.state.selection).toEqual(caret('a', 1));
    editor.setBlocks([md('a', 'a longer text from the host')]);
    expect(text()).toBe('a longer text from the host');
    expect(refused).toEqual([]);
  });

  it('stops telling a listener once it unsubscribes', () => {
    const guard = createLimit(1);
    const listener = vi.fn();
    const stop = guard.onRefused(listener);
    const extension = defineExtension({ name: 'limit', filterTransaction: guard.filterTransaction });
    const { editor } = startEditor([md('a', 'a')], { extensions: [...coreExtensions(), extension] });
    editor.commands.setSelection(caret('a', 1));
    editor.insertText('b');
    stop();
    editor.insertText('b');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('lets Backspace undo an input rule at the limit, and the next Backspace delete', () => {
    const { editor, text, refused } = limited('abc', 5, true);
    editor.commands.setSelection(caret('a', 3));
    for (const typed of '...') editor.insertText(typed);
    expect(text()).toBe('abc\u2026');
    editor.handleKey(key('Backspace'));
    expect(text()).toBe('abc...');
    editor.handleKey(key('Backspace'));
    expect(text()).toBe('abc..');
    expect(refused).toEqual([]);
  });

  it('lets Backspace undo a markdown shortcut at the limit, and the next Backspace delete', () => {
    const guard = createLimit(4);
    const extension = defineExtension({ name: 'limit', filterTransaction: guard.filterTransaction });
    const { editor } = startEditor([md('a', 'abc'), md('b', '')], { extensions: [...coreExtensions(), extension] });
    const listed = () => editor.state.doc.blocks[1].attrs.kind;
    editor.commands.setSelection(caret('b', 0));
    editor.insertText('-');
    editor.insertText(' ');
    expect([listed(), editor.stats().characters]).toEqual(['bullet', 3]);
    editor.handleKey(key('Backspace'));
    expect([listed(), editor.stats().characters]).not.toEqual(['bullet', 3]);
    expect(editor.stats().characters).toBe(5);
    editor.handleKey(key('Backspace'));
    expect(editor.stats().characters).toBe(4);
  });
});
