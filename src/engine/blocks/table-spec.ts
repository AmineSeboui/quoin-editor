import type { Inline } from '../model/types';
import { countOf } from '../model/count';
import type { BlockSpec } from '../schema/types';
import { extraFields, optionalNumber, regionOf, str, withDefined, withExtra } from './data-fields';

const KNOWN = ['rows', 'header', 'align', 'widths'];
const COLUMN_ALIGNS = ['left', 'center', 'right'];
const CELL_WRITE = { escapePipes: true, hardBreak: 'br' } as const;

export const cellKey = (row: number, col: number) => `cell:${row}:${col}`;

function columnAligns(value: unknown, cols: number): (string | null)[] {
  return Array.from({ length: cols }, (_, col) => {
    const align = Array.isArray(value) ? value[col] : undefined;
    return typeof align === 'string' && COLUMN_ALIGNS.includes(align) ? align : null;
  });
}

/** A width in pixels for each column, every one of them above zero, or `null`. */
export const validWidths = (value: unknown, cols: number): number[] | null =>
  Array.isArray(value) && value.length === cols && value.every((width) => (optionalNumber(width) ?? 0) > 0)
    ? value
    : null;

export const tableSpec: BlockSpec = {
  type: 'TABLE',
  flow: 'structured',

  fromData(data, ctx) {
    const rows: unknown[][] = Array.isArray(data.rows) ? data.rows.map((row) => (Array.isArray(row) ? row : [])) : [];
    const cols = rows.reduce((widest, row) => Math.max(widest, row.length), 0);
    const regions: Record<string, Inline> = {};
    rows.forEach((row, r) => {
      for (let c = 0; c < cols; c++) regions[cellKey(r, c)] = ctx.inline.parse(str(row[c]), { softBreak: 'space' });
    });
    return {
      attrs: withDefined({
        header: data.header !== false,
        align: columnAligns(data.align, cols),
        widths: validWidths(data.widths, cols) ?? undefined,
        rows: rows.length,
        cols,
        extra: extraFields(data, KNOWN),
      }),
      regions,
    };
  },

  toData(block, ctx) {
    const { attrs } = block;
    const cols = countOf(attrs.cols);
    const rows = Array.from({ length: countOf(attrs.rows) }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ctx.inline.serialize(regionOf(block, cellKey(r, c)), CELL_WRITE)),
    );
    const widths = validWidths(attrs.widths, cols) ?? undefined;
    return withExtra({ rows, header: attrs.header !== false, align: columnAligns(attrs.align, cols), widths }, attrs);
  },

  initial() {
    const regions: Record<string, Inline> = {};
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) regions[cellKey(r, c)] = [];
    return { attrs: { header: true, align: [null, null], rows: 3, cols: 2 }, regions };
  },
};
