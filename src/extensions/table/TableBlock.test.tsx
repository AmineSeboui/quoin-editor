import { act, fireEvent, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { textSelection, type QuoinBlock } from '../../engine';
import { cellKey } from '../../engine/blocks/table-spec';
import { mountCanvas, paragraph } from '../../blocks/void/test-canvas';
import { clipboardEvent, fakeTransfer } from '../../view/clipboard/test-transfer';
import { tableExtension } from './table-extension';
import { tableUiStore } from './table-ui-store';

const table = (data: Record<string, unknown> = {}): QuoinBlock => ({
  id: 't',
  type: 'TABLE',
  data: { rows: [['Name', 'Size'], ['a', '2'], ['b', '3']], header: true, align: [null, 'right'], ...data },
});

const at = (row: number, col: number, offset = 0) => ({ block: 't', region: cellKey(row, col), offset });

function mount(data: Record<string, unknown> = {}, options: Parameters<typeof mountCanvas>[1] = {}) {
  const mounted = mountCanvas([paragraph('p', ''), table(data), paragraph('q', '')], {
    extensions: [tableExtension()],
    ...options,
  });
  const select = (anchor: ReturnType<typeof at>, head = anchor) =>
    act(() => {
      const { controller } = mounted.handle();
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(anchor, head)));
      controller.focus();
    });
  const rows = () => mounted.handle().editor.getBlocks()[1].data.rows;
  return { ...mounted, select, rows };
}

describe('a table block', () => {
  it('is a native table with a header row of column headers, every cell a textbox named by its row and column', () => {
    mount();
    const grid = screen.getByRole('table', { name: 'Table' });
    const headers = within(grid).getAllByRole('columnheader');
    expect(headers.map((header) => header.textContent)).toEqual(['Name', 'Size']);
    expect(headers.every((header) => header.getAttribute('scope') === 'col')).toBe(true);
    expect(within(grid).getAllByRole('cell')).toHaveLength(4);
    expect(screen.getByRole('textbox', { name: 'Row 3, column 2' })).toHaveTextContent('3');
  });

  it('aligns its columns, and keeps the widths it was given', () => {
    const { shell } = mount({ widths: [120, 80] });
    expect(within(shell('t')).getAllByRole('columnheader')[1]).toHaveStyle({ textAlign: 'right' });
    const grid = shell('t').querySelector('table')!;
    expect(grid).toHaveStyle({ width: '200px', tableLayout: 'fixed' });
    expect([...grid.querySelectorAll('col')].map((col) => col.style.width)).toEqual(['120px', '80px']);
  });

  it('shows the widths a column drag previews, unless they no longer match its columns', () => {
    const { handle, shell } = mount();
    const preview = (widths: number[]) =>
      act(() => tableUiStore(handle().controller).set({ preview: { block: 't', widths } }));
    preview([50, 60]);
    expect([...shell('t').querySelectorAll('col')].map((col) => col.style.width)).toEqual(['50px', '60px']);
    preview([50, 60, 70]);
    expect(shell('t').querySelector('colgroup')).toBeNull();
    act(() => tableUiStore(handle().controller).set({ preview: null }));
  });

  it('draws every row as data when it has no header row', () => {
    mount({ header: false });
    expect(screen.queryByRole('columnheader')).toBeNull();
    expect(screen.getAllByRole('cell')).toHaveLength(6);
  });

  it('paints the cells of a cell range, and only those', () => {
    const { shell, select } = mount();
    select(at(1, 1), at(2, 0, 1));
    const painted = [...shell('t').querySelectorAll('[data-in-range]')].map((cell) => cell.textContent);
    expect(painted).toEqual(['a', '2', 'b', '3']);
  });

  it('takes its names from the options of the extension', () => {
    mount({}, { extensions: [tableExtension({ labels: { table: 'Tableau', cell: (row, col) => `L${row}C${col}` } })] });
    expect(screen.getByRole('table', { name: 'Tableau' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'L1C2' })).toHaveTextContent('Size');
  });

  it('has no accessibility violations', async () => {
    const { container } = mount({ widths: [120, 80] });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('a table block on a read-only canvas', () => {
  it('reads as a focusable region holding the table, with read-only cells and no controls', async () => {
    const { container, shell } = mount({}, { readOnly: true });
    const region = screen.getByRole('region', { name: 'Table' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Row 1, column 1' })).toHaveAttribute('aria-readonly', 'true');
    expect(shell('t').querySelector('[data-quoin-table-controls]')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('keys in a table block', () => {
  it('type over a cell range into its first cell', () => {
    const { select, rows, selection, press } = mount();
    select(at(1, 0), at(2, 1));
    press('x');
    expect(rows()).toEqual([['Name', 'Size'], ['x', ''], ['', '']]);
    expect(selection()).toEqual(textSelection(at(1, 0, 1)));
  });

  it('move between rows with the arrows, and leave the table from its first and last rows', () => {
    const empty = { rows: [['', ''], ['', '']] };
    const { select, selection, press } = mount(empty);
    select(at(0, 1));
    press('ArrowDown');
    expect(selection()).toEqual(textSelection(at(1, 1)));
    press('ArrowDown');
    expect(selection()).toEqual(textSelection({ block: 'q', region: 'text', offset: 0 }));
    select(at(1, 0));
    press('ArrowUp');
    expect(selection()).toEqual(textSelection(at(0, 0)));
    press('ArrowUp');
    expect(selection()).toEqual(textSelection({ block: 'p', region: 'text', offset: 0 }));
  });

  it('enter the table from the block above in its first row, and from the block below in its last row', () => {
    const { handle, selection, press } = mount({ rows: [['', ''], ['', '']] });
    act(() => handle().focus({ block: 'p', region: 'text', offset: 0 }));
    press('ArrowDown');
    expect(selection()).toEqual(textSelection(at(0, 0)));
    act(() => handle().focus({ block: 'q', region: 'text', offset: 0 }));
    press('ArrowUp');
    expect(selection()).toEqual(textSelection(at(1, 1)));
  });

  it('extend the selection into a cell range with Shift and the arrows', () => {
    const { select, selection, shell } = mount({ rows: [['', ''], ['', '']] });
    select(at(0, 0));
    act(() => void fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown', shiftKey: true }));
    expect(selection()).toEqual(textSelection(at(0, 0), at(1, 0)));
    expect(shell('t').querySelectorAll('[data-in-range]')).toHaveLength(2);
  });

  it('put the caret at the end of a cell pressed outside its text', () => {
    const { shell, selection } = mount();
    const cell = shell('t').querySelector('td[data-row="2"][data-col="0"]')!;
    act(() => void cell.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })));
    expect(selection()).toEqual(textSelection(at(2, 0, 1)));
  });
});

describe('the clipboard over a cell range', () => {
  const wide = { rows: [['a', 'b', 'c'], ['d', 'e', 'f']], align: [null, null, null] };

  it('cuts the cells of the range and nothing else, as one step of history', () => {
    const { select, rows, handle } = mount(wide);
    select(at(0, 1), at(1, 0));
    const { transfer, store } = fakeTransfer();
    act(() => void document.activeElement!.dispatchEvent(clipboardEvent('cut', transfer)));
    expect(store.get('text/plain')).toBeDefined();
    expect(rows()).toEqual([['', '', 'c'], ['', '', 'f']]);
    act(() => void handle().editor.commands.undo());
    expect(rows()).toEqual(wide.rows);
  });

  it('pastes text over the range into its first cell', () => {
    const { select, rows } = mount(wide);
    select(at(1, 2), at(0, 1));
    const { transfer } = fakeTransfer({ 'text/plain': 'x\r\ny' });
    act(() => void document.activeElement!.dispatchEvent(clipboardEvent('paste', transfer)));
    expect(rows()).toEqual([['a', 'x<br>y', ''], ['d', '', '']]);
  });
});
