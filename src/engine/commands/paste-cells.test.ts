import { describe, expect, it } from 'vitest';
import { createBlockCodec } from '../blocks/codec';
import { cellKey } from '../blocks/table-spec';
import type { QuoinBlock } from '../model/quoin-block';
import type { EngineBlock } from '../model/types';
import { createSchema } from '../schema/create-schema';
import type { EditorState } from '../state/editor-state';
import { historyPlugin, undo } from '../state/history';
import { textSelection } from '../state/selection';
import { blocksOf, buildState, run, type Caret, type SelectionSpec } from '../test-support/build-state';
import { pasteCells } from './paste-cells';

const table = (data: Record<string, unknown>): QuoinBlock => ({ id: 't', type: 'TABLE', data: { header: true, ...data } });
const grid = table({ rows: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']], align: [null, 'right', null] });

function cells(rows: string[][]): EngineBlock {
  const [block] = createBlockCodec(createSchema()).toEngineBlocks(table({ rows }));
  return block;
}

const at = (row: number, col: number, offset = 0): Caret => ({ block: 1, region: cellKey(row, col), offset });
const stateWith = (selection: SelectionSpec, block = grid) =>
  buildState(['Above', block], selection, { plugins: [historyPlugin()] });
const dataOf = (state: EditorState) => blocksOf(state)[1].data;

describe('pasteCells', () => {
  it('writes the cells from the first cell of a cell range, emptying the rest of the range, as one step', () => {
    const state = stateWith({ anchor: at(2, 2), head: at(1, 0, 1) });
    const { ok, state: next } = run(state, pasteCells(cells([['x', '**y**']])));
    expect(ok).toBe(true);
    expect(dataOf(next).rows).toEqual([['a', 'b', 'c'], ['x', '**y**', ''], ['', '', '']]);
    expect(next.selection).toEqual(textSelection({ block: 'b1', region: cellKey(1, 1), offset: 1 }));
    expect(run(next, undo).state.doc).toEqual(state.doc);
  });

  it('writes the cells from the cell holding a caret, over what they held', () => {
    const next = run(stateWith(at(0, 1, 1)), pasteCells(cells([['x'], ['y']]))).state;
    expect(dataOf(next).rows).toEqual([['a', 'x', 'c'], ['d', 'y', 'f'], ['g', 'h', 'i']]);
  });

  it('adds the rows and columns the cells reach past, unaligned and as wide as the last column', () => {
    const wide = table({ rows: [['a', 'b'], ['c', 'd']], align: [null, 'right'], widths: [80, 90] });
    const next = run(stateWith(at(1, 1), wide), pasteCells(cells([['x', 'y'], ['z', 'w']]))).state;
    expect(dataOf(next)).toEqual({
      rows: [['a', 'b', ''], ['c', 'x', 'y'], ['', 'z', 'w']],
      header: true,
      align: [null, 'right', null],
      widths: [80, 90, 90],
    });
  });

  it('does nothing outside a table or without cells to write', () => {
    expect(run(stateWith({ block: 0, offset: 1 }), pasteCells(cells([['x']]))).ok).toBe(false);
    expect(run(stateWith(at(0, 0)), pasteCells(cells([]))).ok).toBe(false);
  });
});
