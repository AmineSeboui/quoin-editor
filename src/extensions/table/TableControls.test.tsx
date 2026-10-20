import { createRef, useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { textSelection, type QuoinBlock } from '../../engine';
import { cellKey } from '../../engine/blocks/table-spec';
import { addColumn, removeColumn, removeRow } from '../../engine/commands/table-commands';
import { mountCanvas, paragraph } from '../../blocks/void/test-canvas';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../../canvas/canvas-props';
import { tableExtension } from './table-extension';

const ROWS = [
  ['Name', 'Size'],
  ['a', '2'],
  ['b', '3'],
];

const table = (data: Record<string, unknown> = {}): QuoinBlock => ({
  id: 't',
  type: 'TABLE',
  data: { rows: ROWS, header: true, align: [null, null], ...data },
});

const at = (row: number, col: number, offset = 0) => ({ block: 't', region: cellKey(row, col), offset });

const ROW = 30;
const COL = 100;

// jsdom lays nothing out, so every row of the table is 30 px high and every column 100 px wide, from the top left
// corner of the page.
function layOutTable() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const row = this.closest('tr')?.rowIndex ?? 0;
    if (this instanceof HTMLTableCellElement) return new DOMRect(this.cellIndex * COL, row * ROW, COL, ROW);
    if (this instanceof HTMLTableRowElement) return new DOMRect(0, row * ROW, 2 * COL, ROW);
    if (this instanceof HTMLTableElement) return new DOMRect(0, 0, 2 * COL, this.rows.length * ROW);
    return new DOMRect(0, 0, 0, 0);
  });
}

function mount(data: Record<string, unknown> = {}, options: Parameters<typeof mountCanvas>[1] = {}) {
  const mounted = mountCanvas([paragraph('p', 'Above'), table(data)], { extensions: [tableExtension()], ...options });
  const caretIn = (row: number, col: number) =>
    act(() => {
      const { controller } = mounted.handle();
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(at(row, col))));
      controller.focus();
    });
  const dataOf = () => mounted.handle().editor.getBlocks()[1].data;
  const host = (row: number, col: number) => screen.getByRole('textbox', { name: `Row ${row + 1}, column ${col + 1}` });
  return { ...mounted, caretIn, dataOf, host };
}

const key = (target: Element, init: KeyboardEventInit) => act(() => void fireEvent.keyDown(target, init));

// A pointer moved over the table draws the controls of the cell under it, so a handle is pressed where it is, without
// the moves that would take the pointer there from the corner of the page. jsdom has no PointerEvent, and React hears
// a pointer event by its type whatever its class.
const press = (name: string) =>
  act(() => void screen.getByRole('button', { name }).dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })));

afterEach(() => vi.restoreAllMocks());

describe('the controls of a table', () => {
  it("are the handles of the caret's row and column while focus is in the editor", () => {
    const { caretIn } = mount();
    expect(screen.queryByRole('toolbar', { name: 'Table controls' })).toBeNull();
    caretIn(1, 1);
    const toolbar = screen.getByRole('toolbar', { name: 'Table controls' });
    expect(within(toolbar).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      'Row 2 options',
      'Column 2 options',
    ]);
    expect(screen.getAllByRole('separator', { name: /^Resize column/ })).toHaveLength(2);
  });

  it('come back as soon as a read-only canvas turns editable again', () => {
    const extensions = [tableExtension()];
    const handle = createRef<QuoinEditorHandle>();
    function Host() {
      const [readOnly, setReadOnly] = useState(false);
      const [blocks, setBlocks] = useState([paragraph('p', 'Above'), table()]);
      return (
        <>
          <button type="button" onClick={() => setReadOnly((current) => !current)}>
            Switch
          </button>
          <BlockCanvas ref={handle} blocks={blocks} onChange={setBlocks} extensions={extensions} readOnly={readOnly} />
        </>
      );
    }
    render(<Host />);
    act(() => handle.current!.focus(at(1, 1)));
    const toolbar = () => screen.queryByRole('toolbar', { name: 'Table controls' });
    expect(toolbar()).not.toBeNull();
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Switch' })));
    expect(toolbar()).toBeNull();
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Switch' })));
    expect(toolbar()).not.toBeNull();
  });

  it('are never drawn on a read-only canvas', () => {
    const { caretIn } = mount({}, { readOnly: true });
    caretIn(1, 1);
    expect(screen.queryByRole('toolbar')).toBeNull();
    expect(screen.queryByRole('separator', { name: /^Resize column/ })).toBeNull();
  });

  it('open a row menu that inserts, moves and deletes rows, announces it, and gives focus back to the caret', async () => {
    const user = userEvent.setup();
    const { caretIn, dataOf, host } = mount();
    caretIn(1, 0);
    press('Row 2 options');
    const menu = screen.getByRole('menu', { name: 'Row 2 options' });
    expect(within(menu).queryByRole('menuitemcheckbox')).toBeNull();
    await user.click(within(menu).getByRole('menuitem', { name: 'Insert row below' }));
    expect(dataOf().rows).toEqual([ROWS[0], ROWS[1], ['', ''], ROWS[2]]);
    expect(screen.getByRole('status')).toHaveTextContent('Row inserted');
    expect(host(1, 0)).toHaveFocus();
    press('Row 2 options');
    await user.click(screen.getByRole('menuitem', { name: 'Move row up' }));
    expect(dataOf().rows).toEqual([ROWS[1], ROWS[0], ['', ''], ROWS[2]]);
  });

  it('offer the header row in the menu of the first row, and nothing a row cannot do', async () => {
    const user = userEvent.setup();
    const { caretIn, dataOf } = mount({ rows: [['a', 'b']] });
    caretIn(0, 0);
    press('Row 1 options');
    expect(screen.getByRole('menuitem', { name: 'Move row up' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: 'Delete row' })).toHaveAttribute('aria-disabled', 'true');
    const header = screen.getByRole('menuitemcheckbox', { name: 'Header row' });
    expect(header).toBeChecked();
    await user.click(header);
    expect(dataOf().header).toBe(false);
    expect(screen.getByRole('status')).toHaveTextContent('Header row off');
  });

  it('open a column menu that aligns, clears the alignment and deletes the column', async () => {
    const user = userEvent.setup();
    const { caretIn, dataOf } = mount();
    caretIn(2, 1);
    const open = () => press('Column 2 options');
    open();
    await user.click(screen.getByRole('menuitemradio', { name: 'Align right' }));
    expect(dataOf().align).toEqual([null, 'right']);
    expect(screen.getByRole('status')).toHaveTextContent('Column aligned right');
    open();
    expect(screen.getByRole('menuitemradio', { name: 'Align right' })).toBeChecked();
    await user.click(screen.getByRole('menuitemradio', { name: 'Align right' }));
    expect(dataOf().align).toEqual([null, null]);
    expect(screen.getByRole('status')).toHaveTextContent('Column alignment cleared');
    open();
    await user.click(screen.getByRole('menuitem', { name: 'Delete column' }));
    expect(dataOf().rows).toEqual([['Name'], ['a'], ['b']]);
    expect(screen.getByRole('status')).toHaveTextContent('Column deleted');
  });

  it('are reached from a cell with Alt+F10, walked with the arrows, and left with Escape', () => {
    const { caretIn, host } = mount();
    caretIn(1, 1);
    key(host(1, 1), { key: 'F10', altKey: true });
    const column = screen.getByRole('button', { name: 'Column 2 options' });
    expect(column).toHaveFocus();
    key(column, { key: 'ArrowLeft' });
    expect(screen.getByRole('button', { name: 'Row 2 options' })).toHaveFocus();
    key(document.activeElement!, { key: 'Escape' });
    expect(host(1, 1)).toHaveFocus();
  });

  it("go on with Tab to the border of the caret's column, and back with Shift+Tab", () => {
    const { caretIn, host } = mount();
    caretIn(1, 0);
    key(host(1, 0), { key: 'F10', altKey: true });
    key(document.activeElement!, { key: 'Tab' });
    const border = screen.getByRole('separator', { name: 'Resize column 1' });
    expect(border).toHaveFocus();
    key(border, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Column 1 options' })).toHaveFocus();
    key(document.activeElement!, { key: 'Tab' });
    key(border, { key: 'Escape' });
    expect(host(1, 0)).toHaveFocus();
  });
});

describe('the insert buttons of a table', () => {
  it('show on the edge between two rows near the start of the table, and insert a row there', () => {
    layOutTable();
    const { shell, dataOf } = mount();
    const cell = shell('t').querySelector('td[data-row="1"][data-col="0"]')!;
    act(() => void cell.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 6, clientY: 2 * ROW + 2 })));
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Insert row 3' })));
    expect(dataOf().rows).toEqual([ROWS[0], ROWS[1], ['', ''], ROWS[2]]);
    expect(screen.queryByRole('button', { name: 'Insert column 2' })).toBeNull();
  });

  it('show on the edge between two columns near the top of the table, and insert a column there', () => {
    layOutTable();
    const { shell, dataOf } = mount();
    const cell = shell('t').querySelector('th[data-col="1"]')!;
    act(() => void cell.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: COL + 3, clientY: 4 })));
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Insert column 2' })));
    expect(dataOf().rows).toEqual([['Name', '', 'Size'], ['a', '', '2'], ['b', '', '3']]);
  });

  // The table is measured again a frame after a change, so the edge the pointer last rested on is past its end then.
  const nextFrames = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));
  const hover = (target: Element, clientX: number, clientY: number) =>
    act(() => void target.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX, clientY })));

  it('leave an edge past the end of a table that lost its last column under a pointer that has not moved', async () => {
    layOutTable();
    const { shell, handle } = mount();
    hover(shell('t').querySelector('th[data-col="1"]')!, 2 * COL - 1, 4);
    expect(screen.getByRole('button', { name: 'Insert column 3' })).toBeInTheDocument();
    act(() => void handle().controller.run(removeColumn('t', 1)));
    await nextFrames();
    expect(screen.getByRole('group', { name: 'Editor' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Insert column/ })).toBeNull();
  });

  it('leave an edge past the end of a table that lost its last row under a pointer that has not moved', async () => {
    layOutTable();
    const { shell, handle } = mount();
    hover(shell('t').querySelector('td[data-row="2"][data-col="0"]')!, 6, 3 * ROW - 1);
    expect(screen.getByRole('button', { name: 'Insert row 4' })).toBeInTheDocument();
    act(() => void handle().controller.run(removeRow('t', 2)));
    await nextFrames();
    expect(screen.getByRole('group', { name: 'Editor' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Insert row/ })).toBeNull();
  });

  it('go away once the table changes shape, until the pointer moves again', async () => {
    layOutTable();
    const { shell, handle } = mount();
    const header = shell('t').querySelector('th[data-col="1"]')!;
    hover(header, COL + 3, 4);
    act(() => void handle().controller.run(addColumn('t', 2)));
    await nextFrames();
    expect(screen.queryByRole('button', { name: /^Insert column/ })).toBeNull();
    hover(header, COL + 3, 4);
    expect(screen.getByRole('button', { name: 'Insert column 2' })).toBeInTheDocument();
  });
});

describe('the column borders of a table', () => {
  it('are separators at the width the column is drawn at, which the arrows step by 10 pixels, or 50 with Shift', () => {
    layOutTable();
    const { caretIn, dataOf } = mount();
    caretIn(1, 0);
    const border = screen.getByRole('separator', { name: 'Resize column 1' });
    expect(border).toHaveAttribute('aria-orientation', 'vertical');
    expect(border).toHaveAttribute('aria-valuenow', '100');
    expect(border).toHaveAttribute('aria-valuetext', '100 pixels');
    key(border, { key: 'ArrowRight' });
    expect(dataOf().widths).toEqual([110, 100]);
    key(border, { key: 'ArrowLeft', shiftKey: true });
    expect(dataOf().widths).toEqual([50, 100]);
  });

  it('show the width a drag reaches, and write it once when the drag ends', () => {
    layOutTable();
    const { caretIn, dataOf, changes, shell } = mount();
    caretIn(1, 1);
    const border = screen.getByRole('separator', { name: 'Resize column 2' });
    const before = changes.length;
    const pointer = (type: string, clientX: number) =>
      act(() => void border.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, clientX })));
    pointer('pointerdown', 200);
    pointer('pointermove', 240);
    pointer('pointermove', 260);
    expect([...shell('t').querySelectorAll('col')].map((col) => col.style.width)).toEqual(['100px', '160px']);
    expect(changes).toHaveLength(before);
    pointer('pointerup', 260);
    expect(dataOf().widths).toEqual([100, 160]);
    expect(changes).toHaveLength(before + 1);
  });
});
