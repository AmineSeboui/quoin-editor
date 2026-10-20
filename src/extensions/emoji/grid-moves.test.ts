import { gridMove } from './grid-moves';

// Two sections laid out as rows of 3: one of 5 cells, then one of 4.
const ROWS = [3, 2, 3, 1];

describe('gridMove', () => {
  it('moves right and left along a row and on into the next or the previous one', () => {
    expect(gridMove(ROWS, { row: 0, col: 0 }, 'ArrowRight')).toEqual({ row: 0, col: 1 });
    expect(gridMove(ROWS, { row: 0, col: 2 }, 'ArrowRight')).toEqual({ row: 1, col: 0 });
    expect(gridMove(ROWS, { row: 2, col: 0 }, 'ArrowLeft')).toEqual({ row: 1, col: 1 });
    expect(gridMove(ROWS, { row: 1, col: 1 }, 'ArrowLeft')).toEqual({ row: 1, col: 0 });
  });

  it('moves down and up a column, to the last cell of a shorter row', () => {
    expect(gridMove(ROWS, { row: 0, col: 1 }, 'ArrowDown')).toEqual({ row: 1, col: 1 });
    expect(gridMove(ROWS, { row: 0, col: 2 }, 'ArrowDown')).toEqual({ row: 1, col: 1 });
    expect(gridMove(ROWS, { row: 2, col: 2 }, 'ArrowDown')).toEqual({ row: 3, col: 0 });
    expect(gridMove(ROWS, { row: 2, col: 2 }, 'ArrowUp')).toEqual({ row: 1, col: 1 });
  });

  it('stays at the edges of the grid', () => {
    expect(gridMove(ROWS, { row: 0, col: 0 }, 'ArrowLeft')).toEqual({ row: 0, col: 0 });
    expect(gridMove(ROWS, { row: 0, col: 1 }, 'ArrowUp')).toEqual({ row: 0, col: 1 });
    expect(gridMove(ROWS, { row: 3, col: 0 }, 'ArrowRight')).toEqual({ row: 3, col: 0 });
    expect(gridMove(ROWS, { row: 3, col: 0 }, 'ArrowDown')).toEqual({ row: 3, col: 0 });
  });

  it('goes to the ends of the row with Home and End, and of the grid with Ctrl', () => {
    expect(gridMove(ROWS, { row: 2, col: 1 }, 'Home')).toEqual({ row: 2, col: 0 });
    expect(gridMove(ROWS, { row: 2, col: 1 }, 'End')).toEqual({ row: 2, col: 2 });
    expect(gridMove(ROWS, { row: 2, col: 1 }, 'Home', true)).toEqual({ row: 0, col: 0 });
    expect(gridMove(ROWS, { row: 1, col: 0 }, 'End', true)).toEqual({ row: 3, col: 0 });
  });

  it('moves nothing for any other key', () => {
    expect(gridMove(ROWS, { row: 1, col: 0 }, 'PageDown')).toBeNull();
    expect(gridMove(ROWS, { row: 1, col: 0 }, 'a')).toBeNull();
  });
});
