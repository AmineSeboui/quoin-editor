import { cellKey } from '../blocks/table-spec';
import type { Inline } from '../model/types';
import { emit, type Context, type Sink } from './html-context';
import { tagName } from './html-dom';
import { inlineFromNodes } from './html-inline';

type Row = { readonly cells: readonly Element[]; readonly head: boolean };

const SECTIONS = new Set(['thead', 'tbody', 'tfoot']);

function rowOf(tr: Element, head: boolean): Row {
  return { cells: Array.from(tr.children).filter((cell) => ['td', 'th'].includes(tagName(cell))), head };
}

function tableRows(table: Element): Row[] {
  const rows: Row[] = [];
  for (const part of Array.from(table.children)) {
    const tag = tagName(part);
    if (tag === 'tr') rows.push(rowOf(part, false));
    else if (SECTIONS.has(tag)) {
      for (const tr of Array.from(part.children)) if (tagName(tr) === 'tr') rows.push(rowOf(tr, tag === 'thead'));
    }
  }
  return rows;
}

export function tableBlock(table: Element, ctx: Context, sink: Sink): void {
  const rows = tableRows(table);
  const cols = rows.reduce((widest, row) => Math.max(widest, row.cells.length), 0);
  if (rows.length === 0 || cols === 0) return;
  const regions: Record<string, Inline> = {};
  rows.forEach((row, r) => {
    for (let c = 0; c < cols; c++) {
      const cell = row.cells[c];
      regions[cellKey(r, c)] = cell === undefined ? [] : inlineFromNodes(cell.childNodes, ctx);
    }
  });
  const header = rows[0].head || rows[0].cells.some((cell) => tagName(cell) === 'th');
  emit(sink, 'TABLE', ctx.indent, { header, align: Array<null>(cols).fill(null), rows: rows.length, cols }, regions);
}
