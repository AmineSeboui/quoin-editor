import { describe, expect, it } from 'vitest';
import { cellKey } from '../blocks/table-spec';
import type { QuoinBlock } from '../model/quoin-block';
import { buildState, run, type Caret, type SelectionSpec } from '../test-support/build-state';
import { applyTransaction, getPluginState, type EditorState } from './editor-state';
import {
  cellSelection,
  cellSelectionKey,
  cellSelectionPlugin,
  cellsInRange,
  rangeHasCell,
  selectCells,
} from './cell-selection';
import { textSelection } from './selection';
import { Transaction } from './transaction';

const table: QuoinBlock = {
  id: 't',
  type: 'TABLE',
  data: { rows: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']], header: true, align: [null, null, null] },
};

const at = (row: number, col: number, offset = 0): Caret => ({ block: 1, region: cellKey(row, col), offset });

const stateWith = (selection: SelectionSpec) =>
  buildState(['Above', table, 'Below'], selection, { plugins: [cellSelectionPlugin] });

const rangeOf = (state: EditorState) => getPluginState(state, cellSelectionKey);

describe('the cell selection', () => {
  it('is the cells of a table that a selection from one cell to another spans', () => {
    expect(rangeOf(stateWith({ anchor: at(0, 1, 1), head: at(2, 0) }))).toEqual({ block: 'b1', anchor: [0, 1], head: [2, 0] });
  });

  it('is nothing for a caret, a selection inside one cell, or one that leaves the table', () => {
    for (const selection of [
      at(1, 1),
      { anchor: at(1, 1), head: at(1, 1, 1) },
      { anchor: at(1, 1), head: { block: 2, offset: 1 } },
      { anchor: { block: 0, offset: 0 }, head: { block: 2, offset: 1 } },
      { node: 1 },
    ]) {
      expect(rangeOf(stateWith(selection))).toBeNull();
    }
  });

  it('keeps the same range object while the cells it spans stay the same', () => {
    const state = stateWith({ anchor: at(0, 0), head: at(1, 1) });
    const moved = textSelection(
      { block: 'b1', region: cellKey(0, 0), offset: 1 },
      { block: 'b1', region: cellKey(1, 1), offset: 0 },
    );
    const next = applyTransaction(state, new Transaction(state).setSelection(moved));
    expect(rangeOf(next)).toBe(rangeOf(state));
  });

  it('is read from the state whether or not the plugin is registered', () => {
    const plain = buildState(['Above', table], { anchor: at(2, 2), head: at(1, 0) });
    expect(cellSelection(plain)).toEqual({ block: 'b1', anchor: [2, 2], head: [1, 0] });
    expect(cellSelection(stateWith({ anchor: at(2, 2), head: at(1, 0) }))).toEqual(cellSelection(plain));
  });

  it('spans the rectangle between its two cells, row by row, in either direction', () => {
    const cells = [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
    ];
    expect(cellsInRange({ block: 'b1', anchor: [0, 2], head: [1, 1] })).toEqual(cells);
    expect(cellsInRange({ block: 'b1', anchor: [1, 1], head: [0, 2] })).toEqual(cells);
    const range = { block: 'b1', anchor: [1, 1], head: [0, 2] } as const;
    expect([[0, 0], [0, 1], [1, 2], [2, 1]].map(([row, col]) => rangeHasCell(range, [row, col]))).toEqual([false, true, true, false]);
  });
});

describe('selectCells', () => {
  it('selects from the start of the first cell to the end of the last', () => {
    const { ok, state } = run(stateWith(at(0, 0)), selectCells('b1', [2, 2], [0, 1]));
    expect(ok).toBe(true);
    expect(state.selection).toEqual(
      textSelection({ block: 'b1', region: cellKey(2, 2), offset: 0 }, { block: 'b1', region: cellKey(0, 1), offset: 1 }),
    );
    expect(rangeOf(state)).toEqual({ block: 'b1', anchor: [2, 2], head: [0, 1] });
  });

  it('refuses cells that are not in the table and blocks that are not tables', () => {
    const state = stateWith(at(0, 0));
    expect(run(state, selectCells('b1', [0, 0], [3, 0])).ok).toBe(false);
    expect(run(state, selectCells('b0', [0, 0], [1, 0])).ok).toBe(false);
  });
});
