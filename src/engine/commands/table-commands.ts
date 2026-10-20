import { cellKey } from '../blocks/table-spec';
import { requireBlockIndex } from '../model/doc';
import { newId } from '../model/new-id';
import type { BlockAttrs, EngineBlock, Inline } from '../model/types';
import { primaryRegion, textSelection } from '../state/selection';
import { Transaction } from '../state/transaction';
import { insertBlocksStep, replaceBlockStep } from '../transform/block-steps';
import { descendantsEnd, headBlockId, isParagraph, regionLength } from './block-helpers';
import type { Command } from './command';
import {
  columnAligns,
  followedSelection,
  isIndex,
  movedOrder,
  rebuiltTable,
  storedWidths,
  tableBlock,
  tableShape,
  validWidths,
  type ColumnAlign,
  type TablePlan,
  type TableShape,
} from './table-shape';

function changeTable(blockId: string, change: (block: EngineBlock) => EngineBlock | null, plan?: TablePlan): Command {
  return (state, dispatch) => {
    const block = tableBlock(state.doc, blockId);
    const next = block && change(block);
    if (!next) return false;
    const tr = new Transaction(state).step(replaceBlockStep(next));
    dispatch?.(plan ? tr.setSelection(followedSelection(state.selection, blockId, plan)) : tr);
    return true;
  };
}

function reshape(blockId: string, plan: (block: EngineBlock, shape: TableShape) => TablePlan | null): Command {
  return (state, dispatch) => {
    const block = tableBlock(state.doc, blockId);
    const made = block && plan(block, tableShape(block));
    return made ? changeTable(blockId, (table) => rebuiltTable(table, made), made)(state, dispatch) : false;
  };
}

function spliced<T>(list: readonly T[], index: number, remove: number, ...insert: T[]): T[] {
  const copy = [...list];
  copy.splice(index, remove, ...insert);
  return copy;
}

const reordered = <T>(list: readonly T[], order: readonly number[]): T[] => order.map((i) => list[i]);

const columnAttrs = (align: readonly (ColumnAlign | null)[], widths: readonly number[] | null): BlockAttrs =>
  widths === null ? { align } : { align, widths };

/** Inserts an empty row at `index`, from 0 above the first row to the row count below the last. */
export const addRow = (blockId: string, index: number): Command =>
  reshape(blockId, (_, { rows, cols }) =>
    isIndex(index, rows + 1)
      ? {
          rows: rows + 1,
          cols,
          source: (row, col) => (row === index ? null : [row < index ? row : row - 1, col]),
          target: ([row, col]) => [row < index ? row : row + 1, col],
          landing: (cell) => cell,
        }
      : null,
  );

/** Removes the row at `index`. A table keeps at least one row. */
export const removeRow = (blockId: string, index: number): Command =>
  reshape(blockId, (_, { rows, cols }) =>
    isIndex(index, rows) && rows > 1
      ? {
          rows: rows - 1,
          cols,
          source: (row, col) => [row < index ? row : row + 1, col],
          target: ([row, col]) => (row === index ? null : [row < index ? row : row - 1, col]),
          landing: ([, col]) => [Math.min(index, rows - 2), col],
        }
      : null,
  );

export const moveRow = (blockId: string, from: number, to: number): Command =>
  reshape(blockId, (_, { rows, cols }) => {
    if (!isIndex(from, rows) || !isIndex(to, rows) || from === to) return null;
    const order = movedOrder(rows, from, to);
    return {
      rows,
      cols,
      source: (row, col) => [order[row], col],
      target: ([row, col]) => [order.indexOf(row), col],
      landing: (cell) => cell,
    };
  });

/** Inserts an empty column at `index`, unaligned and as wide as the column before it. */
export const addColumn = (blockId: string, index: number): Command =>
  reshape(blockId, (block, { rows, cols }) => {
    if (!isIndex(index, cols + 1)) return null;
    const widths = storedWidths(block, cols);
    return {
      rows,
      cols: cols + 1,
      source: (row, col) => (col === index ? null : [row, col < index ? col : col - 1]),
      target: ([row, col]) => [row, col < index ? col : col + 1],
      landing: (cell) => cell,
      attrs: columnAttrs(
        spliced(columnAligns(block, cols), index, 0, null),
        widths && spliced(widths, index, 0, widths[Math.max(index - 1, 0)]),
      ),
    };
  });

/** Removes the column at `index`. A table keeps at least one column. */
export const removeColumn = (blockId: string, index: number): Command =>
  reshape(blockId, (block, { rows, cols }) => {
    if (!isIndex(index, cols) || cols < 2) return null;
    const widths = storedWidths(block, cols);
    return {
      rows,
      cols: cols - 1,
      source: (row, col) => [row, col < index ? col : col + 1],
      target: ([row, col]) => (col === index ? null : [row, col < index ? col : col - 1]),
      landing: ([row]) => [row, Math.min(index, cols - 2)],
      attrs: columnAttrs(spliced(columnAligns(block, cols), index, 1), widths && spliced(widths, index, 1)),
    };
  });

export const moveColumn = (blockId: string, from: number, to: number): Command =>
  reshape(blockId, (block, { rows, cols }) => {
    if (!isIndex(from, cols) || !isIndex(to, cols) || from === to) return null;
    const order = movedOrder(cols, from, to);
    const widths = storedWidths(block, cols);
    return {
      rows,
      cols,
      source: (row, col) => [row, order[col]],
      target: ([row, col]) => [row, order.indexOf(col)],
      landing: (cell) => cell,
      attrs: columnAttrs(reordered(columnAligns(block, cols), order), widths && reordered(widths, order)),
    };
  });

export const toggleHeaderRow = (blockId: string): Command =>
  changeTable(blockId, (block) => ({ ...block, attrs: { ...block.attrs, header: block.attrs.header === false } }));

const withAttrs = (block: EngineBlock, attrs: BlockAttrs): EngineBlock => ({ ...block, attrs: { ...block.attrs, ...attrs } });

/** Aligns the column's cells, or with `null` leaves them to the reading direction. */
export const setColumnAlign = (blockId: string, col: number, align: ColumnAlign | null): Command =>
  changeTable(blockId, (block) => {
    const aligns = columnAligns(block, tableShape(block).cols);
    if (!isIndex(col, aligns.length) || aligns[col] === align) return null;
    return withAttrs(block, { align: spliced(aligns, col, 1, align) });
  });

/**
 * Sets the column's width in pixels. A table that keeps no widths yet takes the others from `drawn`, the widths its
 * columns are drawn at, so that they stay as they are.
 */
export const setColumnWidth = (blockId: string, col: number, px: number, drawn?: readonly number[]): Command =>
  changeTable(blockId, (block) => {
    const { cols } = tableShape(block);
    const width = Math.round(px);
    if (!isIndex(col, cols) || !(width > 0)) return null;
    const stored = storedWidths(block, cols);
    if (stored?.[col] === width) return null;
    const widths = stored ?? (drawn && validWidths(drawn.map(Math.round), cols)) ?? Array(cols).fill(width);
    return withAttrs(block, { widths: spliced(widths, col, 1, width) });
  });

const isCount = (value: number) => Number.isInteger(value) && value > 0;

function emptyCells({ rows, cols }: TableShape): Record<string, Inline> {
  const regions: Record<string, Inline> = {};
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) regions[cellKey(row, col)] = [];
  return regions;
}

/**
 * Inserts an empty table with a header row after the selection's block and the blocks nested under it, or in place of
 * an empty paragraph, and puts the caret in its first cell.
 */
export function insertTable(rows: number, cols: number, options: { newId?: () => string } = {}): Command {
  return (state, dispatch) => {
    const { doc, schema } = state;
    const id = headBlockId(state.selection);
    if (id === null || !isCount(rows) || !isCount(cols)) return false;
    const index = requireBlockIndex(doc, id);
    const current = doc.blocks[index];
    const fills = isParagraph(current) && regionLength(current, primaryRegion(schema, current) ?? '') === 0;
    const table: EngineBlock = {
      id: fills ? current.id : (options.newId ?? newId)(),
      type: 'TABLE',
      indent: current.indent,
      attrs: { header: true, align: Array.from({ length: cols }, () => null), rows, cols },
      regions: emptyCells({ rows, cols }),
    };
    const tr = new Transaction(state).step(
      fills ? replaceBlockStep(table) : insertBlocksStep(descendantsEnd(doc, index), [table]),
    );
    dispatch?.(tr.setSelection(textSelection({ block: table.id, region: cellKey(0, 0), offset: 0 })));
    return true;
  };
}

