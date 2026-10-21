import { cellKey } from '../blocks/table-spec';
import type { Command } from '../commands/command';
import { cellOf, isIndex, tableBlock, tableShape, type Cell } from '../commands/table-shape';
import { inlineLength } from '../model/inline';
import type { EditorState } from './editor-state';
import { createPluginKey, type PluginSpec } from './plugin';
import { textSelection } from './selection';
import { Transaction } from './transaction';

/** A rectangle of a table's cells, between the cell the selection started in and the one it reaches. */
export type CellRange = { readonly block: string; readonly anchor: Cell; readonly head: Cell };

export const cellSelectionKey = createPluginKey<CellRange | null>('cellSelection');

function rangeOfSelection({ doc, selection }: EditorState): CellRange | null {
  if (selection?.kind !== 'text') return null;
  const { anchor, head } = selection;
  if (anchor.block !== head.block || anchor.region === head.region || tableBlock(doc, anchor.block) === null) return null;
  const from = cellOf(anchor.region);
  const to = cellOf(head.region);
  return from && to ? { block: anchor.block, anchor: from, head: to } : null;
}

const sameCell = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];

const sameRange = (a: CellRange | null, b: CellRange | null): boolean =>
  a === b || (a !== null && b !== null && a.block === b.block && sameCell(a.anchor, b.anchor) && sameCell(a.head, b.head));

/** Holds the cell range of the selection, the same object for as long as it spans the same cells. */
export const cellSelectionPlugin: PluginSpec<CellRange | null> = {
  key: cellSelectionKey,
  init: rangeOfSelection,
  apply(_tr, value, _old, next) {
    const range = rangeOfSelection(next);
    return sameRange(range, value) ? value : range;
  },
};

export function cellSelection(state: EditorState): CellRange | null {
  const held = state.pluginState.get(cellSelectionKey.name) as CellRange | null | undefined;
  return held === undefined ? rangeOfSelection(state) : held;
}

const between = (value: number, a: number, b: number) => value >= Math.min(a, b) && value <= Math.max(a, b);

export const rangeHasCell = ({ anchor, head }: CellRange, [row, col]: Cell): boolean =>
  between(row, anchor[0], head[0]) && between(col, anchor[1], head[1]);

/** The cells of the range, row by row. */
export function cellsInRange({ anchor, head }: CellRange): Cell[] {
  const cells: Cell[] = [];
  for (let row = Math.min(anchor[0], head[0]); row <= Math.max(anchor[0], head[0]); row++) {
    for (let col = Math.min(anchor[1], head[1]); col <= Math.max(anchor[1], head[1]); col++) cells.push([row, col]);
  }
  return cells;
}

/** Selects the cells from `anchor` to `head`: from the start of the first one to the end of the last. */
export function selectCells(blockId: string, anchor: Cell, head: Cell): Command {
  return (state, dispatch) => {
    const block = tableBlock(state.doc, blockId);
    const { rows, cols } = block === null ? { rows: 0, cols: 0 } : tableShape(block);
    const inside = ([row, col]: Cell) => isIndex(row, rows) && isIndex(col, cols);
    if (block === null || !inside(anchor) || !inside(head)) return false;
    const end = cellKey(...head);
    const selection = textSelection(
      { block: blockId, region: cellKey(...anchor), offset: 0 },
      { block: blockId, region: end, offset: inlineLength(block.regions[end] ?? []) },
    );
    dispatch?.(new Transaction(state).setSelection(selection));
    return true;
  };
}
