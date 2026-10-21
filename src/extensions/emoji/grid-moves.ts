/** A cell of a grid, by its row and its column in that row. */
export type GridCell = { readonly row: number; readonly col: number };

type Move = (rows: readonly number[], cell: GridCell, ctrl: boolean) => GridCell;

const inRow = (rows: readonly number[], row: number, col: number): GridCell => ({ row, col: Math.min(col, rows[row] - 1) });

const MOVES: Readonly<Record<string, Move>> = {
  ArrowRight: (rows, { row, col }) => {
    if (col + 1 < rows[row]) return { row, col: col + 1 };
    return row + 1 < rows.length ? { row: row + 1, col: 0 } : { row, col };
  },
  ArrowLeft: (rows, { row, col }) => {
    if (col > 0) return { row, col: col - 1 };
    return row > 0 ? { row: row - 1, col: rows[row - 1] - 1 } : { row, col };
  },
  ArrowDown: (rows, { row, col }) => inRow(rows, Math.min(row + 1, rows.length - 1), col),
  ArrowUp: (rows, { row, col }) => inRow(rows, Math.max(row - 1, 0), col),
  Home: (_, { row }, ctrl) => (ctrl ? { row: 0, col: 0 } : { row, col: 0 }),
  End: (rows, { row }, ctrl) => {
    const to = ctrl ? rows.length - 1 : row;
    return { row: to, col: rows[to] - 1 };
  },
};

/**
 * Where a key moves the active cell of a grid whose rows hold `rows` cells each, or null for a key that moves nothing.
 * The arrows stop at the edges of the grid, and Right and Left run on from the end of a row into the next one.
 */
export function gridMove(rows: readonly number[], cell: GridCell, key: string, ctrl = false): GridCell | null {
  return Object.hasOwn(MOVES, key) ? MOVES[key](rows, cell, ctrl) : null;
}
