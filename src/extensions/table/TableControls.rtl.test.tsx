import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COL, layOutTable, ROW, WIDTH } from './test-layout';
import { key, mount, ROWS } from './test-table';

beforeEach(() => {
  document.documentElement.setAttribute('dir', 'rtl');
  layOutTable('rtl');
});

afterEach(() => {
  document.documentElement.removeAttribute('dir');
  vi.restoreAllMocks();
});

const hover = (target: Element, clientX: number, clientY: number) =>
  act(() => void target.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX, clientY })));

const leftOf = (element: HTMLElement) => parseFloat(element.style.left);

describe('the controls of a table on a right to left page, where its first column is on the right', () => {
  it('draw the handle of a row outside the right border, where the rows start', () => {
    const { caretIn } = mount();
    caretIn(1, 1);
    expect(leftOf(screen.getByRole('button', { name: 'Row 2 options' }))).toBeGreaterThan(WIDTH);
  });

  it('offer to insert a row near the right border, not the left one, and insert it there', () => {
    const { shell, dataOf } = mount();
    const cell = shell('t').querySelector('td[data-row="1"][data-col="0"]')!;
    hover(cell, 6, 2 * ROW + 2);
    expect(screen.queryByRole('button', { name: /^Insert row/ })).toBeNull();
    hover(cell, WIDTH - 6, 2 * ROW + 2);
    const insert = screen.getByRole('button', { name: 'Insert row 3' });
    expect(leftOf(insert)).toBeGreaterThan(WIDTH);
    act(() => void fireEvent.click(insert));
    expect(dataOf().rows).toEqual([ROWS[0], ROWS[1], ['', ''], ROWS[2]]);
  });

  it('number the edges between columns from the right, and insert a column at the one pointed at', () => {
    const { shell, dataOf } = mount();
    const header = shell('t').querySelector('th[data-col="0"]')!;
    hover(header, 3, 4);
    expect(leftOf(screen.getByRole('button', { name: 'Insert column 3' }))).toBe(0);
    hover(header, WIDTH - 3, 4);
    const insert = screen.getByRole('button', { name: 'Insert column 1' });
    expect(leftOf(insert)).toBe(WIDTH);
    act(() => void fireEvent.click(insert));
    expect(dataOf().rows).toEqual([['', 'Name', 'Size'], ['', 'a', '2'], ['', 'b', '3']]);
  });

  it('draw the border of each column on its left, where the column ends', () => {
    const { caretIn } = mount();
    caretIn(1, 0);
    expect(leftOf(screen.getByRole('separator', { name: 'Resize column 1' }))).toBe(COL);
    expect(leftOf(screen.getByRole('separator', { name: 'Resize column 2' }))).toBe(0);
  });

  it('widen a column whose border is dragged left, away from it', () => {
    const { caretIn, dataOf, shell } = mount();
    caretIn(1, 0);
    const border = screen.getByRole('separator', { name: 'Resize column 1' });
    const pointer = (type: string, clientX: number) =>
      act(() => void border.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, clientX })));
    pointer('pointerdown', COL);
    pointer('pointermove', COL - 40);
    pointer('pointermove', COL - 60);
    expect([...shell('t').querySelectorAll('col')].map((col) => col.style.width)).toEqual(['160px', '100px']);
    pointer('pointerup', COL - 60);
    expect(dataOf().widths).toEqual([160, 100]);
  });

  it('widen a column with the left arrow, which moves its border away from it, and narrow it with the right', () => {
    const { caretIn, dataOf } = mount();
    caretIn(1, 0);
    const border = screen.getByRole('separator', { name: 'Resize column 1' });
    key(border, { key: 'ArrowLeft' });
    expect(dataOf().widths).toEqual([110, 100]);
    key(border, { key: 'ArrowRight', shiftKey: true });
    expect(dataOf().widths).toEqual([50, 100]);
  });
});

describe('the controls of a table whose page turns round under them', () => {
  it('are drawn again where the columns now run', async () => {
    document.documentElement.setAttribute('dir', 'ltr');
    vi.restoreAllMocks();
    layOutTable('ltr');
    const { caretIn } = mount();
    caretIn(1, 0);
    const border = () => screen.getByRole('separator', { name: 'Resize column 1' });
    expect(leftOf(border())).toBe(COL);
    vi.restoreAllMocks();
    layOutTable('rtl');
    document.documentElement.setAttribute('dir', 'rtl');
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(leftOf(screen.getByRole('button', { name: 'Row 2 options' }))).toBeGreaterThan(WIDTH);
    expect(leftOf(border())).toBe(COL);
    expect(leftOf(screen.getByRole('separator', { name: 'Resize column 2' }))).toBe(0);
  });
});
