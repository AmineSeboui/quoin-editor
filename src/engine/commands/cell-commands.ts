import { cellKey } from '../blocks/table-spec';
import { blockById } from '../model/doc';
import { inlineLength } from '../model/inline';
import type { Attrs, EngineDoc, Pos } from '../model/types';
import { cellSelection, cellsInRange, type CellRange } from '../state/cell-selection';
import { textSelection } from '../state/selection';
import { Transaction } from '../state/transaction';
import { replaceInlineStep } from '../transform/replace-inline-step';
import type { Command } from './command';
import { insertTextAt } from './insert-text-at';
import { setMark, toggleMark } from './marks';
import { markCoverage } from './selection-marks';

type FilledCell = { readonly region: string; readonly length: number };

function filledCells(doc: EngineDoc, range: CellRange): FilledCell[] {
  const regions = blockById(doc, range.block)?.regions ?? {};
  return cellsInRange(range).flatMap((cell) => {
    const region = cellKey(...cell);
    const length = inlineLength(regions[region] ?? []);
    return length > 0 ? [{ region, length }] : [];
  });
}

function firstCell({ block, anchor, head }: CellRange): Pos {
  return { block, region: cellKey(Math.min(anchor[0], head[0]), Math.min(anchor[1], head[1])), offset: 0 };
}

function emptied(state: Parameters<Command>[0], range: CellRange): Transaction {
  const tr = new Transaction(state);
  for (const { region, length } of filledCells(state.doc, range)) {
    tr.step(replaceInlineStep(range.block, region, 0, length, []));
  }
  return tr;
}

/** Empties every cell of the cell range and leaves the caret in its first cell. */
export const deleteCellContents: Command = (state, dispatch) => {
  const range = cellSelection(state);
  if (range === null) return false;
  dispatch?.(emptied(state, range).setSelection(textSelection(firstCell(range))));
  return true;
};

/** Empties every cell of the cell range and writes `text` in its first cell, as typing over the range does. */
export function typeOverCells(text: string): Command {
  return (state, dispatch) => {
    const range = cellSelection(state);
    if (range === null || text === '') return false;
    const tr = emptied(state, range);
    dispatch?.(tr.setSelection(textSelection(insertTextAt(tr, state.schema, firstCell(range), text))));
    return true;
  };
}

/**
 * Applies a mark to the whole of every cell in the cell range through the editor's own mark commands, one cell after
 * another in one transaction: it is removed once every cell carries it all through, and added to all otherwise.
 */
export function setCellsMark(type: string, attrs?: Attrs): Command {
  return (state, dispatch) => {
    const range = cellSelection(state);
    const cells = range === null ? [] : filledCells(state.doc, range);
    const regions = range === null ? undefined : blockById(state.doc, range.block)?.regions;
    if (range === null || regions === undefined || cells.length === 0) return false;
    const carried = cells.every(({ region }) => markCoverage(regions[region], type, attrs).every);
    const mark = carried ? toggleMark(type, attrs) : setMark(type, attrs);
    const tr = new Transaction(state);
    for (const { region, length } of cells) {
      const start = { block: range.block, region, offset: 0 };
      const whole = textSelection(start, { ...start, offset: length });
      mark({ ...state, doc: tr.doc, selection: whole, storedMarks: null }, (cell) => {
        for (const step of cell.steps) tr.step(step);
      });
    }
    if (!tr.docChanged) return false;
    dispatch?.(tr);
    return true;
  };
}
