import { coreExtensions, defineExtension } from '../../engine';
import { caret, key, md, range, startEditor } from '../../engine/test-support/editor-fixtures';
import { atomKeymap } from './atom-keymap';

const MATH = ['math'];

function editorWith(markdown: string, offset: number) {
  const atoms = defineExtension({ name: 'atoms', priority: 200, keymap: atomKeymap(MATH) });
  const { editor } = startEditor([md('p', markdown)], { extensions: [...coreExtensions(), atoms] });
  editor.commands.setSelection(caret('p', offset));
  const shift = (arrow: 'ArrowLeft' | 'ArrowRight') => editor.handleKey(key(arrow, { shiftKey: true }));
  return { editor, shift };
}

describe('Shift and an arrow beside an atom', () => {
  it('steps the head back over exactly the atom before it, at the end of a line', () => {
    const { editor, shift } = editorWith('a $x$', 3);
    expect(shift('ArrowLeft')).toBe(true);
    expect(editor.state.selection).toEqual(range('p', 3, 2));
  });

  it('steps the head forward over exactly the atom after it, and back again', () => {
    const { editor, shift } = editorWith('a $x$ b', 2);
    expect(shift('ArrowRight')).toBe(true);
    expect(editor.state.selection).toEqual(range('p', 2, 3));
    expect(shift('ArrowLeft')).toBe(true);
    expect(editor.state.selection).toEqual(caret('p', 2));
  });

  it('extends a selection that already runs up to the atom, keeping its anchor', () => {
    const { editor, shift } = editorWith('a $x$ b', 5);
    editor.commands.setSelection(range('p', 5, 3));
    expect(shift('ArrowLeft')).toBe(true);
    expect(editor.state.selection).toEqual(range('p', 5, 2));
  });

  it('leaves text, an atom of another type and the edges of the line to the browser', () => {
    const text = editorWith('a $x$ b', 4);
    expect(text.shift('ArrowLeft')).toBe(false);
    expect(text.editor.state.selection).toEqual(caret('p', 4));

    const mention = editorWith('a [@Ada](mention:1)', 3);
    expect(mention.shift('ArrowLeft')).toBe(false);

    const edges = editorWith('$x$', 0);
    expect(edges.shift('ArrowLeft')).toBe(false);
    edges.editor.commands.setSelection(caret('p', 1));
    expect(edges.shift('ArrowRight')).toBe(false);
  });
});
