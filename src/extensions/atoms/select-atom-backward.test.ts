import { atom, coreExtensions, defineExtension, text } from '../../engine';
import { caret, key, md, range, startEditor } from '../../engine/test-support/editor-fixtures';
import { selectAtomBackward } from './select-atom-backward';
import { selectedAtomDecorations } from './selected-atom-decorations';

const MATH = ['math'];

function editorWith(markdown: string, offset: number) {
  const atoms = defineExtension({
    name: 'atoms',
    priority: 200,
    keymap: { Backspace: selectAtomBackward(MATH) },
    decorations: selectedAtomDecorations(MATH),
  });
  const { editor } = startEditor([md('p', markdown)], { extensions: [...coreExtensions(), atoms] });
  editor.commands.setSelection(caret('p', offset));
  const content = () => editor.state.doc.blocks[0].regions.text;
  const backspace = () => editor.handleKey(key('Backspace'));
  return { editor, content, backspace };
}

describe('Backspace right after an atom', () => {
  it('selects the atom first, and deletes it with the second Backspace', () => {
    const { editor, content, backspace } = editorWith('a $x$ b', 3);
    backspace();
    expect(editor.state.selection).toEqual(range('p', 2, 3));
    expect(content()).toEqual([text('a '), atom('math', { latex: 'x' }), text(' b')]);
    backspace();
    expect(content()).toEqual([text('a  b')]);
    expect(editor.state.selection).toEqual(caret('p', 2));
  });

  it('brings the atom back with one undo after it is deleted', () => {
    const { editor, content, backspace } = editorWith('a $x$ b', 3);
    backspace();
    backspace();
    editor.commands.undo();
    expect(content()).toEqual([text('a '), atom('math', { latex: 'x' }), text(' b')]);
  });

  it('marks the selected atom for highlighting while the selection covers it, either way round', () => {
    const { editor, backspace } = editorWith('a $x$ b', 3);
    expect(editor.decorations()).toEqual([]);
    backspace();
    const highlight = { kind: 'inline', block: 'p', region: 'text', from: 2, to: 3, attrs: { 'data-quoin-selected-atom': '' } };
    expect(editor.decorations()).toEqual([highlight]);
    editor.commands.setSelection(range('p', 3, 2));
    expect(editor.decorations()).toEqual([highlight]);
    editor.commands.setSelection(range('p', 1, 3));
    expect(editor.decorations()).toEqual([]);
  });

  it('leaves an atom of another type, text, and a selection to the core Backspace', () => {
    const mention = editorWith('a [@Ada](mention:1)', 3);
    mention.backspace();
    expect(mention.content()).toEqual([text('a ')]);

    const plain = editorWith('a $x$ b', 4);
    plain.backspace();
    expect(plain.content()).toEqual([text('a '), atom('math', { latex: 'x' }), text('b')]);

    const selected = editorWith('ab $x$', 0);
    selected.editor.commands.setSelection(range('p', 1, 4));
    selected.backspace();
    expect(selected.content()).toEqual([text('a')]);
  });

  it('selects nothing at the start of a line', () => {
    const { editor, backspace } = editorWith('$x$', 0);
    expect(selectAtomBackward(MATH)(editor.state)).toBe(false);
    backspace();
    expect(editor.state.selection).toEqual(caret('p', 0));
  });
});
