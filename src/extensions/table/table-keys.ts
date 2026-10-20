import type { Command, EditorState, EngineBlock, Pos } from '../../engine';
import { cellKey } from '../../engine/blocks/table-spec';
import { deleteCellContents, setCellsMark } from '../../engine/commands/cell-commands';
import { insertHardBreak } from '../../engine/commands/hard-break';
import { addRow } from '../../engine/commands/table-commands';
import { cellOf, tableBlock, tableShape, type Cell, type TableShape } from '../../engine/commands/table-shape';
import { inlineLength } from '../../engine/model/inline';
import { cellSelection } from '../../engine/state/cell-selection';
import { isCollapsed, textSelection } from '../../engine/state/selection';
import { Transaction } from '../../engine/state/transaction';

export type HeadCell = { readonly block: EngineBlock; readonly cell: Cell; readonly head: Pos; readonly shape: TableShape };

/** The cell of a table that holds the head of the selection. */
export function headCell({ doc, selection }: EditorState): HeadCell | null {
  if (selection?.kind !== 'text') return null;
  const { head } = selection;
  const block = tableBlock(doc, head.block);
  const cell = block && cellOf(head.region);
  return block && cell ? { block, cell, head, shape: tableShape(block) } : null;
}

export const cellLength = (block: EngineBlock, [row, col]: Cell): number =>
  inlineLength(block.regions[cellKey(row, col)] ?? []);

export const cellPos = (block: EngineBlock, cell: Cell, atEnd = false): Pos => ({
  block: block.id,
  region: cellKey(...cell),
  offset: atEnd ? cellLength(block, cell) : 0,
});

const moveTo = (state: EditorState, pos: Pos) => new Transaction(state).setSelection(textSelection(pos));

/** Runs a command that changes the table, then puts the caret at the start of the cell `at` names. */
const thenCaretIn =
  (command: Command, blockId: string, at: Cell): Command =>
  (state, dispatch) => {
    const caret = textSelection({ block: blockId, region: cellKey(...at), offset: 0 });
    return command(state, dispatch && ((tr) => dispatch(tr.setSelection(caret))));
  };

// Cells in reading order, row after row.
const cellAtIndex = (index: number, { cols }: TableShape): Cell => [Math.floor(index / cols), index % cols];
const indexOfCell = ([row, col]: Cell, { cols }: TableShape): number => row * cols + col;

const nextCell: Command = (state, dispatch) => {
  const caret = headCell(state);
  if (caret === null) return false;
  const { block, cell, shape } = caret;
  const next = indexOfCell(cell, shape) + 1;
  if (next === shape.rows * shape.cols) {
    return thenCaretIn(addRow(block.id, shape.rows), block.id, [shape.rows, 0])(state, dispatch);
  }
  dispatch?.(moveTo(state, cellPos(block, cellAtIndex(next, shape), true)));
  return true;
};

const previousCell: Command = (state, dispatch) => {
  const caret = headCell(state);
  if (caret === null) return false;
  const { block, cell, shape } = caret;
  const previous = indexOfCell(cell, shape) - 1;
  if (previous >= 0) dispatch?.(moveTo(state, cellPos(block, cellAtIndex(previous, shape), true)));
  return true;
};

const enterInCell: Command = (state, dispatch) => {
  const caret = headCell(state);
  if (caret === null) return false;
  if (cellSelection(state) !== null) return true;
  const { block, cell, shape } = caret;
  const [row, col] = cell;
  if (row === shape.rows - 1 && cellLength(block, cell) === 0) {
    return thenCaretIn(addRow(block.id, shape.rows), block.id, [shape.rows, col])(state, dispatch);
  }
  return insertHardBreak(state, dispatch);
};

// A caret at the edge of a cell has nothing to join across, so the key stops there rather than reaching the block.
const stopAtCellEdge =
  (atEnd: boolean): Command =>
  (state) => {
    const caret = headCell(state);
    if (caret === null || !isCollapsed(state.selection)) return false;
    return caret.head.offset === (atEnd ? cellLength(caret.block, caret.cell) : 0);
  };

const firstThatApplies =
  (...commands: readonly Command[]): Command =>
  (state, dispatch) =>
    commands.some((command) => command(state, dispatch));

const MARK_KEYS: Readonly<Record<string, string>> = {
  'Mod-b': 'bold',
  'Mod-i': 'italic',
  'Mod-u': 'underline',
  'Mod-Shift-s': 'strike',
  'Mod-e': 'code',
  'Mod-Shift-h': 'highlight',
};

/** The keys of a caret or a cell range in a table, which run before the core ones and leave every other key to them. */
export const tableKeymap: Readonly<Record<string, Command>> = {
  Tab: nextCell,
  'Shift-Tab': previousCell,
  Enter: enterInCell,
  Backspace: firstThatApplies(deleteCellContents, stopAtCellEdge(false)),
  Delete: firstThatApplies(deleteCellContents, stopAtCellEdge(true)),
  ...Object.fromEntries(Object.entries(MARK_KEYS).map(([name, mark]) => [name, setCellsMark(mark)])),
};
