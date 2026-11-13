import { vi } from 'vitest';
import type { InlineDirection } from '../../ui/direction';

export const ROW = 30;
export const COL = 100;
export const WIDTH = 2 * COL;

/**
 * jsdom lays nothing out, so every row of a table is 30 px high and every column 100 px wide, the first column at the
 * left of the page, or at its right where the page runs right to left. Anything else has no box.
 */
export function layOutTable(direction: InlineDirection = 'ltr') {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const row = this.closest('tr')?.rowIndex ?? 0;
    if (this instanceof HTMLTableCellElement) {
      const left = direction === 'rtl' ? WIDTH - (this.cellIndex + 1) * COL : this.cellIndex * COL;
      return new DOMRect(left, row * ROW, COL, ROW);
    }
    if (this instanceof HTMLTableRowElement) return new DOMRect(0, row * ROW, WIDTH, ROW);
    if (this instanceof HTMLTableElement) return new DOMRect(0, 0, WIDTH, this.rows.length * ROW);
    return new DOMRect(0, 0, 0, 0);
  });
}
