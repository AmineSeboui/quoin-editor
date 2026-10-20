import { coreExtensions, textSelection, type QuoinBlock } from '../../engine';
import { cellKey } from '../../engine/blocks/table-spec';
import { key, md, mod, startEditor } from '../../engine/test-support/editor-fixtures';
import { tableExtension } from './table-extension';

const table = (rows: string[][]): QuoinBlock => ({
  id: 't',
  type: 'TABLE',
  data: { rows, header: true, align: rows[0].map(() => null) },
});

const GRID = [
  ['a', 'b'],
  ['c', 'd'],
];

function tableEditor(rows = GRID) {
  const { editor } = startEditor([md('p', 'Above'), table(rows), md('q', 'Below')], {
    extensions: [...coreExtensions(), tableExtension()],
  });
  const caretIn = (row: number, col: number, offset = 0) =>
    editor.commands.setSelection(textSelection({ block: 't', region: cellKey(row, col), offset }));
  const head = () => {
    const { selection } = editor.state;
    return selection?.kind === 'text' ? [selection.head.region, selection.head.offset] : selection;
  };
  const rowsOf = () => editor.getBlocks()[1].data.rows;
  return { editor, caretIn, head, rowsOf };
}

describe('Tab and Shift+Tab in a table', () => {
  it('move to the end of the next and the previous cell, row after row', () => {
    const { editor, caretIn, head } = tableEditor();
    caretIn(0, 1, 0);
    expect(editor.handleKey(key('Tab'))).toBe(true);
    expect(head()).toEqual([cellKey(1, 0), 1]);
    expect(editor.handleKey(key('Tab', { shiftKey: true }))).toBe(true);
    expect(head()).toEqual([cellKey(0, 1), 1]);
  });

  it('add a row from the last cell and stay put in the first, never indenting the table', () => {
    const { editor, caretIn, head, rowsOf } = tableEditor();
    caretIn(1, 1, 1);
    expect(editor.handleKey(key('Tab'))).toBe(true);
    expect(rowsOf()).toEqual([...GRID, ['', '']]);
    expect(head()).toEqual([cellKey(2, 0), 0]);
    caretIn(0, 0);
    expect(editor.handleKey(key('Tab', { shiftKey: true }))).toBe(true);
    expect(head()).toEqual([cellKey(0, 0), 0]);
    expect(editor.getBlocks()[1].indent).toBeUndefined();
  });

  it('indent as before outside a table', () => {
    const { editor } = tableEditor();
    editor.commands.setSelection(textSelection({ block: 'q', region: 'text', offset: 0 }));
    expect(editor.handleKey(key('Tab'))).toBe(true);
    expect(editor.getBlocks()[2].indent).toBe(1);
  });
});

describe('Enter in a table', () => {
  it('adds a row below from an empty cell of the last row, with the caret under it', () => {
    const { editor, caretIn, head, rowsOf } = tableEditor([['a', 'b'], ['c', '']]);
    caretIn(1, 1);
    expect(editor.handleKey(key('Enter'))).toBe(true);
    expect(rowsOf()).toEqual([['a', 'b'], ['c', ''], ['', '']]);
    expect(head()).toEqual([cellKey(2, 1), 0]);
  });

  it('breaks the line anywhere else', () => {
    const { editor, caretIn, rowsOf } = tableEditor([['a', ''], ['c', 'd']]);
    caretIn(1, 1, 1);
    editor.handleKey(key('Enter'));
    caretIn(0, 1);
    editor.handleKey(key('Enter'));
    expect(rowsOf()).toEqual([['a', '<br>'], ['c', 'd<br>']]);
  });
});

describe('Backspace and Delete in a table', () => {
  it('empty the selected cells', () => {
    const { editor, head, rowsOf } = tableEditor();
    editor.commands.setSelection(
      textSelection({ block: 't', region: cellKey(0, 1), offset: 0 }, { block: 't', region: cellKey(1, 1), offset: 1 }),
    );
    expect(editor.handleKey(key('Backspace'))).toBe(true);
    expect(rowsOf()).toEqual([['a', ''], ['c', '']]);
    expect(head()).toEqual([cellKey(0, 1), 0]);
  });

  it('stop at the edges of a cell', () => {
    const { editor, caretIn, rowsOf, head } = tableEditor();
    caretIn(1, 0);
    expect(editor.handleKey(key('Backspace'))).toBe(true);
    caretIn(0, 1, 1);
    expect(editor.handleKey(key('Delete'))).toBe(true);
    expect(rowsOf()).toEqual(GRID);
    expect(head()).toEqual([cellKey(0, 1), 1]);
    caretIn(0, 1, 1);
    editor.handleKey(key('Backspace'));
    expect(rowsOf()).toEqual([['a', ''], ['c', 'd']]);
  });
});

describe('formatting keys in a table', () => {
  it('format the whole of every selected cell', () => {
    const { editor, rowsOf } = tableEditor();
    editor.commands.setSelection(
      textSelection({ block: 't', region: cellKey(0, 0), offset: 1 }, { block: 't', region: cellKey(1, 0), offset: 0 }),
    );
    expect(editor.handleKey(mod('b'))).toBe(true);
    expect(editor.handleKey(mod('i'))).toBe(true);
    expect(rowsOf()).toEqual([['**_a_**', 'b'], ['**_c_**', 'd']]);
  });
});
