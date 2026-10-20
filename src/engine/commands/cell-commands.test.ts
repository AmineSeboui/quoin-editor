import { describe, expect, it } from 'vitest';
import { cellKey } from '../blocks/table-spec';
import type { QuoinBlock } from '../model/quoin-block';
import { cellSelectionPlugin } from '../state/cell-selection';
import type { EditorState } from '../state/editor-state';
import { historyPlugin, undo } from '../state/history';
import { textSelection } from '../state/selection';
import { blocksOf, buildState, run, type Caret, type SelectionSpec } from '../test-support/build-state';
import { deleteCellContents, setCellsMark, typeOverCells } from './cell-commands';
import type { Command } from './command';

const table: QuoinBlock = {
  id: 't',
  type: 'TABLE',
  data: { rows: [['a', 'b', 'c'], ['d', '', 'f'], ['g', 'h', 'i']], header: true, align: [null, null, null] },
};

const at = (row: number, col: number, offset = 0): Caret => ({ block: 1, region: cellKey(row, col), offset });
const RANGE = { anchor: at(0, 2, 1), head: at(1, 1) };

const stateWith = (selection: SelectionSpec, data: Partial<typeof table.data> = {}) =>
  buildState(['Above', { ...table, data: { ...table.data, ...data } }], selection, {
    plugins: [historyPlugin(), cellSelectionPlugin],
  });

const rowsOf = (state: EditorState) => blocksOf(state)[1].data.rows;
const caretIn = (row: number, col: number, offset = 0) =>
  textSelection({ block: 'b1', region: cellKey(row, col), offset });

function undoable(state: EditorState, command: Command): EditorState {
  const { ok, state: next } = run(state, command);
  expect(ok).toBe(true);
  const undone = run(next, undo).state;
  expect(undone.doc).toEqual(state.doc);
  expect(undone.selection).toEqual(state.selection);
  return next;
}

describe('deleteCellContents', () => {
  it('empties the cells of the range and nothing else, in one step of history, leaving the caret in its first cell', () => {
    const next = undoable(stateWith(RANGE), deleteCellContents);
    expect(rowsOf(next)).toEqual([['a', '', ''], ['d', '', ''], ['g', 'h', 'i']]);
    expect(next.selection).toEqual(caretIn(0, 1));
  });

  it('only collapses a range whose cells are already empty', () => {
    const empty = stateWith(RANGE, { rows: [['a', '', ''], ['d', '', '']] });
    const { ok, state, tr } = run(empty, deleteCellContents);
    expect(ok).toBe(true);
    expect(tr?.docChanged).toBe(false);
    expect(state.selection).toEqual(caretIn(0, 1));
  });

  it('does nothing without a cell range', () => {
    expect(run(stateWith(at(1, 1)), deleteCellContents).ok).toBe(false);
    expect(run(stateWith({ anchor: at(0, 0), head: at(0, 0, 1) }), deleteCellContents).ok).toBe(false);
  });
});

describe('setCellsMark', () => {
  it('marks every cell of the range whole, keeps the range selected, and is one step of history', () => {
    const next = undoable(stateWith(RANGE), setCellsMark('bold'));
    expect(rowsOf(next)).toEqual([['a', '**b**', '**c**'], ['d', '', '**f**'], ['g', 'h', 'i']]);
    expect(next.selection).toEqual(stateWith(RANGE).selection);
  });

  it('removes the mark once every cell of the range carries it all through', () => {
    const marked = run(stateWith(RANGE), setCellsMark('bold')).state;
    expect(rowsOf(undoable(marked, setCellsMark('bold')))).toEqual(rowsOf(stateWith(RANGE)));
  });

  it('adds the mark to every cell while one cell carries it only in part', () => {
    const partly = stateWith(RANGE, { rows: [['a', '**b**', 'c'], ['d', '', '**f**x']] });
    expect(rowsOf(undoable(partly, setCellsMark('italic')))).toEqual([['a', '**_b_**', '_c_'], ['d', '', '**_f_**_x_']]);
    expect(rowsOf(undoable(partly, setCellsMark('bold')))).toEqual([['a', '**b**', '**c**'], ['d', '', '**fx**']]);
  });

  it('does nothing without a cell range, with only empty cells in it, or for a mark it cannot keep', () => {
    expect(run(stateWith(at(0, 1)), setCellsMark('bold')).ok).toBe(false);
    expect(run(stateWith(RANGE), setCellsMark('link')).ok).toBe(false);
    expect(run(stateWith(RANGE, { rows: [['a', '', ''], ['d', '', '']] }), setCellsMark('bold')).ok).toBe(false);
  });
});

describe('typeOverCells', () => {
  it('empties the range and writes the text in its first cell, in one step of history', () => {
    const next = undoable(stateWith(RANGE), typeOverCells('xy'));
    expect(rowsOf(next)).toEqual([['a', 'xy', ''], ['d', '', ''], ['g', 'h', 'i']]);
    expect(next.selection).toEqual(caretIn(0, 1, 2));
  });

  it('does nothing without a cell range or without text', () => {
    expect(run(stateWith(at(0, 1)), typeOverCells('x')).ok).toBe(false);
    expect(run(stateWith(RANGE), typeOverCells('')).ok).toBe(false);
  });
});
