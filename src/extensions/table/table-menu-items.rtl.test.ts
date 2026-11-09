import { createEditor } from '../../engine/extension/editor';
import { tableExtension } from './table-extension';
import { englishTableLabels } from './table-labels';
import { columnMenuItems } from './table-menu-items';
import { ROWS, table } from './test-table';

const SHAPE = { rows: ROWS.length, cols: ROWS[0].length };

/** The header row after running the menu item `id` against a table whose column `col` the menu was opened on. */
function headerAfter(id: string, col: number, direction: 'ltr' | 'rtl'): string[] {
  const editor = createEditor({ blocks: [table()], extensions: [tableExtension()] });
  const item = columnMenuItems(englishTableLabels, 't', col, SHAPE, direction).find((one) => one.id === id);
  if (item === undefined) throw new Error(`no menu item ${id}`);
  item.command(editor.state, (tr) => editor.dispatch(tr));
  const rows = editor.getBlocks()[0].data.rows as string[][];
  return rows[0];
}

/**
 * The menu names sides of the screen, and the wording stays physical wherever the page runs, as ruled on the issue.
 * A column to the left of this one is the one *after* it in the document where the page runs right to left, so the
 * indices are what turn round.
 */
describe('the column menu on a right to left page', () => {
  it('puts a column asked for on the left after this one, where the page puts it on the left', () => {
    expect(headerAfter('left', 0, 'rtl')).toEqual(['Name', '', 'Size']);
  });

  it('puts a column asked for on the right before this one', () => {
    expect(headerAfter('right', 1, 'rtl')).toEqual(['Name', '', 'Size']);
  });

  it('moves a column left by moving it later in the document', () => {
    expect(headerAfter('move-left', 0, 'rtl')).toEqual(['Size', 'Name']);
  });

  it('moves a column right by moving it earlier', () => {
    expect(headerAfter('move-right', 1, 'rtl')).toEqual(['Size', 'Name']);
  });

  it('stops at the edges the page shows, not the ones the document has', () => {
    const items = (col: number) => columnMenuItems(englishTableLabels, 't', col, SHAPE, 'rtl');
    const disabled = (col: number, id: string) => items(col).find((one) => one.id === id)?.disabled;
    expect(disabled(0, 'move-right')).toBe(true);
    expect(disabled(0, 'move-left')).toBe(false);
    expect(disabled(1, 'move-left')).toBe(true);
    expect(disabled(1, 'move-right')).toBe(false);
  });
});

describe('the column menu on a left to right page', () => {
  it('is unchanged: left is before, right is after', () => {
    expect(headerAfter('left', 1, 'ltr')).toEqual(['Name', '', 'Size']);
    expect(headerAfter('right', 0, 'ltr')).toEqual(['Name', '', 'Size']);
    expect(headerAfter('move-left', 1, 'ltr')).toEqual(['Size', 'Name']);
    expect(headerAfter('move-right', 0, 'ltr')).toEqual(['Size', 'Name']);
  });

  it('stops at the first and the last column', () => {
    const disabled = (col: number, id: string) =>
      columnMenuItems(englishTableLabels, 't', col, SHAPE, 'ltr').find((one) => one.id === id)?.disabled;
    expect(disabled(0, 'move-left')).toBe(true);
    expect(disabled(1, 'move-right')).toBe(true);
  });
});
