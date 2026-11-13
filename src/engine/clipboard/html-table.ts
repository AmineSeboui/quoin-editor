import { cellKey } from '../blocks/table-spec';
import type { Inline } from '../model/types';
import { emit, type Context, type Sink } from './html-context';
import { tagName } from './html-dom';
import { inlineFromNodes } from './html-inline';

type Row = { readonly cells: readonly Element[]; readonly head: boolean };

const SECTIONS = new Set(['thead', 'tbody', 'tfoot']);
const MAX_SPAN = 1000;

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

const span = (cell: Element, name: string): number =>
  Math.min(MAX_SPAN, Math.max(1, Number.parseInt(cell.getAttribute(name) ?? '', 10) || 1));

// A merged cell keeps its content in its first slot and leaves the slots it covered empty, so every other cell stays in
// its column.
function grid(rows: readonly Row[]): (Element | null)[][] {
  const slots: (Element | null)[][] = rows.map(() => []);
  rows.forEach(({ cells }, r) => {
    let c = 0;
    for (const cell of cells) {
      while (slots[r][c] !== undefined) c++;
      const across = span(cell, 'colspan');
      const down = Math.min(span(cell, 'rowspan'), rows.length - r);
      for (let dr = 0; dr < down; dr++) {
        for (let dc = 0; dc < across; dc++) slots[r + dr][c + dc] = dr === 0 && dc === 0 ? cell : null;
      }
      c += across;
    }
  });
  return slots;
}

export function tableBlock(table: Element, ctx: Context, sink: Sink): void {
  const rows = tableRows(table);
  const slots = grid(rows);
  const cols = slots.reduce((widest, row) => Math.max(widest, row.length), 0);
  if (rows.length === 0 || cols === 0) return;
  const regions: Record<string, Inline> = {};
  slots.forEach((row, r) => {
    for (let c = 0; c < cols; c++) {
      const cell = row[c];
      regions[cellKey(r, c)] = cell ? inlineFromNodes(cell.childNodes, ctx) : [];
    }
  });
  const header = rows[0].head || rows[0].cells.some((cell) => tagName(cell) === 'th');
  emit(sink, 'TABLE', ctx.indent, { header, align: Array<null>(cols).fill(null), rows: rows.length, cols }, regions);
}
