import { cellKey } from '../blocks/table-spec';
import { blockById } from '../model/doc';
import type { BlockAttrs, EngineBlock, EngineDoc, Inline, Pos, Selection } from '../model/types';
import { textSelection } from '../state/selection';

export type Cell = readonly [row: number, col: number];

export type TableShape = { readonly rows: number; readonly cols: number };

const CELL = /^cell:(\d+):(\d+)$/;

const count = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;

export const tableShape = (block: EngineBlock): TableShape => ({
  rows: count(block.attrs.rows),
  cols: count(block.attrs.cols),
});

export type ColumnAlign = 'left' | 'center' | 'right';

const ALIGNS: readonly unknown[] = ['left', 'center', 'right'];

/** The alignment of each column, `null` for one left to the reading direction. */
export const columnAligns = (block: EngineBlock, cols: number): (ColumnAlign | null)[] =>
  Array.from({ length: cols }, (_, col) => {
    const align = Array.isArray(block.attrs.align) ? block.attrs.align[col] : null;
    return ALIGNS.includes(align) ? (align as ColumnAlign) : null;
  });

export const validWidths = (value: unknown, cols: number): number[] | null =>
  Array.isArray(value) && value.length === cols && value.every((width) => typeof width === 'number' && width > 0)
    ? value
    : null;

/** The width in pixels the block keeps for each of its columns, or `null` when it keeps none for one of them. */
export const storedWidths = (block: EngineBlock, cols: number): number[] | null => validWidths(block.attrs.widths, cols);

export function cellOf(region: string): Cell | null {
  const match = CELL.exec(region);
  return match === null ? null : [Number(match[1]), Number(match[2])];
}

export function tableBlock(doc: EngineDoc, id: string): EngineBlock | null {
  const block = blockById(doc, id);
  return block?.type === 'TABLE' ? block : null;
}

export const isIndex = (index: number, length: number): boolean =>
  Number.isInteger(index) && index >= 0 && index < length;

/** The indexes in their new order once the one at `from` is taken out and put back at `to`. */
export function movedOrder(length: number, from: number, to: number): number[] {
  const order = Array.from({ length }, (_, i) => i).filter((i) => i !== from);
  order.splice(to, 0, from);
  return order;
}

/**
 * How a table is rebuilt: its new size, the old cell each new cell takes its content from (none for a new cell), the
 * new cell each old cell's content went to (none for a removed one), and the cell a caret in a removed cell goes to.
 */
export type TablePlan = {
  readonly rows: number;
  readonly cols: number;
  source(row: number, col: number): Cell | null;
  target(cell: Cell): Cell | null;
  landing(cell: Cell): Cell;
  readonly attrs?: BlockAttrs;
};

export function rebuiltTable(block: EngineBlock, plan: TablePlan): EngineBlock {
  const regions: Record<string, Inline> = {};
  for (let row = 0; row < plan.rows; row++) {
    for (let col = 0; col < plan.cols; col++) {
      const from = plan.source(row, col);
      regions[cellKey(row, col)] = from === null ? [] : (block.regions[cellKey(...from)] ?? []);
    }
  }
  return { ...block, attrs: { ...block.attrs, ...plan.attrs, rows: plan.rows, cols: plan.cols }, regions };
}

function followedPos(pos: Pos, blockId: string, plan: TablePlan): Pos {
  const cell = pos.block === blockId ? cellOf(pos.region) : null;
  if (cell === null) return pos;
  const moved = plan.target(cell);
  return moved === null
    ? { block: blockId, region: cellKey(...plan.landing(cell)), offset: 0 }
    : { ...pos, region: cellKey(...moved) };
}

/** The selection once the table's cells have moved: an end in a cell goes with that cell's content. */
export function followedSelection(selection: Selection | null, blockId: string, plan: TablePlan): Selection | null {
  if (selection?.kind !== 'text') return selection;
  const anchor = followedPos(selection.anchor, blockId, plan);
  const head = followedPos(selection.head, blockId, plan);
  return anchor === selection.anchor && head === selection.head ? selection : textSelection(anchor, head);
}
