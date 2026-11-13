export type Cell = readonly [row: number, col: number];

const CELL = /^cell:(\d+):(\d+)$/;

/** The row and column of a table's cell region, or `null` for a region that is no cell. */
export function cellOf(region: string): Cell | null {
  const match = CELL.exec(region);
  return match === null ? null : [Number(match[1]), Number(match[2])];
}

/** The cells of the rectangle with `a` and `b` at two of its corners, row by row, the top left one first. */
export function cellsBetween(a: Cell, b: Cell): Cell[] {
  const cells: Cell[] = [];
  for (let row = Math.min(a[0], b[0]); row <= Math.max(a[0], b[0]); row++) {
    for (let col = Math.min(a[1], b[1]); col <= Math.max(a[1], b[1]); col++) cells.push([row, col]);
  }
  return cells;
}
