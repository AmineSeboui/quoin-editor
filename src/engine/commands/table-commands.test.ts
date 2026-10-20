import { describe, expect, it } from 'vitest';
import { cellKey } from '../blocks/table-spec';
import { fromMarkdown } from '../markdown/block/from-markdown';
import { toMarkdown } from '../markdown/document/to-markdown';
import type { QuoinBlock } from '../model/quoin-block';
import type { EditorState } from '../state/editor-state';
import { historyPlugin, undo } from '../state/history';
import { nodeSelection, textSelection } from '../state/selection';
import { blocksOf, buildState, caretOf, run, type SelectionSpec } from '../test-support/build-state';
import type { Command } from './command';
import {
  addColumn,
  addRow,
  insertTable,
  moveColumn,
  moveRow,
  removeColumn,
  removeRow,
  setColumnAlign,
  setColumnWidth,
  toggleHeaderRow,
} from './table-commands';

const ROWS = [
  ['a', 'b'],
  ['c', 'd'],
  ['e', 'f'],
];

const table = (data: Record<string, unknown> = {}): QuoinBlock => ({
  id: 't',
  type: 'TABLE',
  data: { rows: ROWS, header: true, align: [null, 'right'], ...data },
});

const at = (row: number, col: number, offset = 0) => ({ block: 1, region: cellKey(row, col), offset });

function headOf(state: EditorState) {
  const { selection } = state;
  return selection?.kind === 'text' ? { region: selection.head.region, offset: selection.head.offset } : selection;
}

const cell = (row: number, col: number, offset = 0) => ({ region: cellKey(row, col), offset });

function tableState(data: Record<string, unknown> = {}, selection: SelectionSpec = at(1, 1, 1)): EditorState {
  return buildState(['Above', table(data), 'Below'], selection, { plugins: [historyPlugin()] });
}

const dataOf = (state: EditorState) => blocksOf(state)[1].data;
const tableOf = (blocks: QuoinBlock[]) => blocks.find((block) => block.type === 'TABLE')?.data;

function cellKeys(state: EditorState): string[] {
  const { attrs } = state.doc.blocks[1];
  const rows = Number(attrs.rows);
  const cols = Number(attrs.cols);
  return Array.from({ length: rows * cols }, (_, i) => cellKey(Math.floor(i / cols), i % cols));
}

function applied(state: EditorState, command: Command): EditorState {
  const result = run(state, command);
  expect(result.ok).toBe(true);
  expect(result.tr?.steps).toHaveLength(1);
  const next = result.state;
  expect(Object.keys(next.doc.blocks[1].regions).sort()).toEqual(cellKeys(next).sort());
  const blocks = blocksOf(next);
  expect(tableOf(fromMarkdown(toMarkdown(blocks, { lossless: true })))).toEqual(dataOf(next));
  const data = dataOf(next);
  if (data.header === true && data.widths === undefined) expect(tableOf(fromMarkdown(toMarkdown(blocks)))).toEqual(data);
  const undone = run(next, undo).state;
  expect(undone.doc).toEqual(state.doc);
  expect(undone.selection).toEqual(state.selection);
  return next;
}

const refused = (state: EditorState, command: Command) => expect(run(state, command).ok).toBe(false);

describe('row commands', () => {
  it('insert an empty row, moving the rows below it down with the caret', () => {
    const next = applied(tableState(), addRow('b1', 1));
    expect(dataOf(next).rows).toEqual([['a', 'b'], ['', ''], ['c', 'd'], ['e', 'f']]);
    expect(headOf(next)).toEqual(cell(2, 1, 1));
    expect(dataOf(applied(tableState(), addRow('b1', 3))).rows).toEqual([...ROWS, ['', '']]);
  });

  it('remove a row, moving the rows below it up, and a caret in it to the row that takes its place', () => {
    const next = applied(tableState(), removeRow('b1', 1));
    expect(dataOf(next).rows).toEqual([['a', 'b'], ['e', 'f']]);
    expect(headOf(next)).toEqual(cell(1, 1));
    expect(headOf(applied(tableState({}, at(2, 0, 1)), removeRow('b1', 2)))).toEqual(cell(1, 0));
    expect(headOf(applied(tableState({}, at(2, 0, 1)), removeRow('b1', 0)))).toEqual(cell(1, 0, 1));
    expect(headOf(applied(tableState({}, at(0, 1, 1)), removeRow('b1', 2)))).toEqual(cell(0, 1, 1));
  });

  it('move a row, its cells and a caret in them with it', () => {
    const down = applied(tableState(), moveRow('b1', 0, 2));
    expect(dataOf(down).rows).toEqual([['c', 'd'], ['e', 'f'], ['a', 'b']]);
    expect(headOf(down)).toEqual(cell(0, 1, 1));
    const up = applied(tableState({}, at(2, 0, 1)), moveRow('b1', 2, 0));
    expect(dataOf(up).rows).toEqual([['e', 'f'], ['a', 'b'], ['c', 'd']]);
    expect(headOf(up)).toEqual(cell(0, 0, 1));
  });

  it('turn the header row off and on, leaving the cells as they are', () => {
    const off = applied(tableState(), toggleHeaderRow('b1'));
    expect(dataOf(off)).toEqual({ rows: ROWS, header: false, align: [null, 'right'] });
    expect(dataOf(applied(off, toggleHeaderRow('b1'))).header).toBe(true);
    expect(headOf(off)).toEqual(cell(1, 1, 1));
  });

  it('refuse rows that are not there, the last row, and blocks that are not tables', () => {
    const state = tableState();
    for (const command of [addRow('b1', -1), addRow('b1', 4), addRow('b1', 1.5), removeRow('b1', 3), moveRow('b1', 0, 3)]) {
      refused(state, command);
    }
    refused(state, moveRow('b1', 1, 1));
    refused(tableState({ rows: [['a', 'b']] }), removeRow('b1', 0));
    refused(state, addRow('b0', 0));
    refused(state, toggleHeaderRow('missing'));
  });
});

describe('column commands', () => {
  it('insert an empty column with no alignment and the width of the column before it', () => {
    const next = applied(tableState({ widths: [120, 80] }), addColumn('b1', 1));
    expect(dataOf(next)).toEqual({
      rows: [['a', '', 'b'], ['c', '', 'd'], ['e', '', 'f']],
      header: true,
      align: [null, null, 'right'],
      widths: [120, 120, 80],
    });
    expect(headOf(next)).toEqual(cell(1, 2, 1));
    expect(dataOf(applied(tableState({ widths: [120, 80] }), addColumn('b1', 0))).widths).toEqual([120, 120, 80]);
    expect(dataOf(applied(tableState(), addColumn('b1', 2))).align).toEqual([null, 'right', null]);
  });

  it('remove a column with its alignment and width, and a caret in it to the column that takes its place', () => {
    const next = applied(tableState({ widths: [120, 80] }), removeColumn('b1', 1));
    expect(dataOf(next)).toEqual({ rows: [['a'], ['c'], ['e']], header: true, align: [null], widths: [120] });
    expect(headOf(next)).toEqual(cell(1, 0));
    expect(headOf(applied(tableState(), removeColumn('b1', 0)))).toEqual(cell(1, 0, 1));
    expect(headOf(applied(tableState({}, at(1, 0, 1)), removeColumn('b1', 1)))).toEqual(cell(1, 0, 1));
  });

  it('move a column with its alignment, its width and a caret in it', () => {
    const next = applied(tableState({ widths: [120, 80] }), moveColumn('b1', 1, 0));
    expect(dataOf(next)).toEqual({
      rows: [['b', 'a'], ['d', 'c'], ['f', 'e']],
      header: true,
      align: ['right', null],
      widths: [80, 120],
    });
    expect(headOf(next)).toEqual(cell(1, 0, 1));
    expect(dataOf(applied(tableState(), moveColumn('b1', 0, 1)))).toEqual({
      rows: [['b', 'a'], ['d', 'c'], ['f', 'e']],
      header: true,
      align: ['right', null],
    });
  });

  it('align a column, and clear its alignment', () => {
    const left = applied(tableState(), setColumnAlign('b1', 0, 'left'));
    expect(dataOf(left).align).toEqual(['left', 'right']);
    expect(dataOf(applied(left, setColumnAlign('b1', 1, null))).align).toEqual(['left', null]);
    expect(headOf(left)).toEqual(cell(1, 1, 1));
  });

  it('set the width of a column, starting the others from the widths they are drawn at', () => {
    expect(dataOf(applied(tableState({ widths: [120, 80] }), setColumnWidth('b1', 1, 99.6))).widths).toEqual([120, 100]);
    expect(dataOf(applied(tableState(), setColumnWidth('b1', 0, 200, [150.4, 90]))).widths).toEqual([200, 90]);
    expect(dataOf(applied(tableState(), setColumnWidth('b1', 1, 200))).widths).toEqual([200, 200]);
  });

  it('refuse columns that are not there, the last column, changes that change nothing and widths that are no width', () => {
    const state = tableState({ widths: [120, 80] });
    for (const command of [
      addColumn('b1', 3),
      removeColumn('b1', 2),
      moveColumn('b1', 0, 0),
      moveColumn('b1', 2, 0),
      setColumnAlign('b1', 1, 'right'),
      setColumnAlign('b1', 2, 'left'),
      setColumnWidth('b1', 0, 120),
      setColumnWidth('b1', 0, 0),
      setColumnWidth('b1', 0, Number.NaN),
      setColumnWidth('b1', 2, 50),
    ]) {
      refused(state, command);
    }
    refused(tableState({ rows: [['a'], ['b']] }), removeColumn('b1', 0));
    refused(state, addColumn('b2', 0));
  });
});

describe('insertTable', () => {
  it('takes the place of an empty paragraph, keeping its id, with the caret in the first cell', () => {
    const state = buildState(['Above', ''], { block: 1, offset: 0 }, { plugins: [historyPlugin()] });
    const { ok, state: next } = run(state, insertTable(2, 3));
    expect(ok).toBe(true);
    expect(blocksOf(next)[1]).toEqual({
      id: 'b1',
      type: 'TABLE',
      data: { rows: [['', '', ''], ['', '', '']], header: true, align: [null, null, null] },
    });
    expect(next.selection).toEqual(textSelection({ block: 'b1', region: cellKey(0, 0), offset: 0 }));
    expect(run(next, undo).state.doc).toEqual(state.doc);
  });

  it('goes after a block with content and the blocks nested under it', () => {
    const state = buildState(['- item', { id: 'x', type: 'MARKDOWN', data: { markdown: '- nested' }, indent: 1 }, 'After'], {
      block: 0,
      offset: 2,
    });
    const next = run(state, insertTable(1, 1, { newId: () => 'new' })).state;
    expect(blocksOf(next).map((block) => block.id)).toEqual(['b0', 'b1', 'new', 'b2']);
    expect(next.selection).toEqual(textSelection({ block: 'new', region: cellKey(0, 0), offset: 0 }));
  });

  it('needs a block to go after and at least one row and one column', () => {
    refused(buildState([''], { block: 0, offset: 0 }), insertTable(0, 2));
    refused(buildState([''], { block: 0, offset: 0 }), insertTable(2, 1.5));
    refused(buildState([]), insertTable(2, 2));
    expect(run(buildState(['', 'x'], { node: 1 }), insertTable(1, 1)).ok).toBe(true);
  });
});

describe('a change to a table the selection is not in', () => {
  it('leaves the selection where it was', () => {
    const state = tableState({}, { node: 1 });
    expect(run(state, addRow('b1', 0)).state.selection).toEqual(nodeSelection('b1'));
    const caret = tableState({}, { block: 2, offset: 2 });
    expect(caretOf(run(caret, removeColumn('b1', 0)).state)).toEqual({ block: 2, offset: 2 });
  });
});
