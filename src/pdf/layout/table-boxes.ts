import { alignOrUndefined } from '../../engine/blocks/data-fields';
import type { EngineBlock } from '../../engine/model/types';
import { tableCells } from '../../engine/render/table-cells';
import { paintLine } from '../paint/paint-line';
import { inlinePieces } from '../text/inline-pieces';
import type { Line } from '../text/line-layout';
import { BODY, CODE_FILL, RULE } from '../text/text-style';
import type { Box, Frame } from './box';
import { indented, type LayoutContext } from './layout-context';
import { baselineOffset, textLines } from './text-boxes';

const SIZE = 10;
const LEADING = 1.35;
const PAD_X = 5;
const PAD_Y = 4;
const BORDER = 0.5;

type Row = { readonly cells: readonly (readonly Line[])[]; readonly header: boolean };

// A row taller than a page is cut between lines into rows that each fit one.
function slices(cells: readonly Line[][], fit: number): (readonly Line[])[][] {
  const tallest = Math.max(1, ...cells.map((lines) => lines.length));
  return Array.from({ length: Math.ceil(tallest / fit) }, (_, slice) => cells.map((lines) => lines.slice(slice * fit, (slice + 1) * fit)));
}

function rowBox({ cells, header }: Row, x: number, width: number, frames: readonly Frame[]): Box {
  const lineHeight = SIZE * LEADING;
  const height = Math.max(1, ...cells.map((lines) => lines.length)) * lineHeight + 2 * PAD_Y;
  return {
    height,
    frames,
    keepWithNext: header,
    paint(canvas, top) {
      if (header) canvas.fillRect(x, top, width * cells.length, height, CODE_FILL);
      cells.forEach((lines, col) => {
        lines.forEach((line, at) => paintLine(canvas, line, x + col * width + PAD_X, top + PAD_Y + at * lineHeight + baselineOffset(SIZE, LEADING)));
        canvas.strokeRect(x + col * width, top, width, height, RULE, BORDER);
      });
    },
  };
}

/** A table as a box for each row, its cells wrapped in equal columns, its header row shaded and bold. */
export function tableBoxes(block: EngineBlock, ctx: LayoutContext, frames: readonly Frame[]): Box[] {
  const rows = tableCells(block);
  const cols = rows[0]?.length ?? 0;
  if (rows.length === 0 || cols === 0) return [];
  const area = indented(ctx, block.indent);
  const width = area.width / cols;
  const aligns: unknown[] = Array.isArray(block.attrs.align) ? block.attrs.align : [];
  const headed = block.attrs.header !== false;
  const fit = Math.max(1, Math.floor((ctx.room - 2 * PAD_Y) / (SIZE * LEADING)));
  return rows.flatMap((cells, row) => {
    const header = headed && row === 0;
    const style = { ...BODY, size: SIZE, bold: header };
    const laid = cells.map((cell, col) =>
      textLines({ blockId: block.id, pieces: inlinePieces(cell, ctx, style), width: width - 2 * PAD_X, align: alignOrUndefined(aligns[col]) }, ctx),
    );
    return slices(laid, fit).map((slice) => rowBox({ cells: slice, header }, area.x, width, frames));
  });
}
