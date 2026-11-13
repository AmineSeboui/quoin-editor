import { cellKey } from '../blocks/table-spec';
import { blockById } from '../model/doc';
import { inlineLength } from '../model/inline';
import type { Attrs, EngineDoc, Inline, Pos } from '../model/types';
import { cellSelection, cellsInRange, type CellRange } from '../state/cell-selection';
import type { EditorState } from '../state/editor-state';
import { textSelection } from '../state/selection';
import { Transaction } from '../state/transaction';
import { replaceInlineStep } from '../transform/replace-inline-step';
import type { Command } from './command';
import { deleteRange } from './delete-range';
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

// Empties the cells of the range, as any deletion across cells does, then writes from its first cell.
function overCells(state: EditorState, write: (tr: Transaction, caret: Pos) => Pos): Transaction | null {
  const { selection } = state;
  if (cellSelection(state) === null || selection?.kind !== 'text') return null;
  const tr = new Transaction(state);
  return tr.setSelection(textSelection(write(tr, deleteRange(tr, state.schema, selection.anchor, selection.head))));
}

/** Empties every cell of the cell range and leaves the caret in its first cell. */
export const deleteCellContents: Command = (state, dispatch) => {
  const tr = overCells(state, (_, caret) => caret);
  if (tr !== null) dispatch?.(tr);
  return tr !== null;
};

/**
 * Empties every cell of the cell range and writes `content` in its first cell, as typing over the range does: text
 * takes the marks of the caret there, and inline content keeps its own.
 */
export function typeOverCells(content: string | Inline): Command {
  return (state, dispatch) => {
    if (content.length === 0) return false;
    const tr = overCells(state, (into, caret) => {
      if (typeof content === 'string') return insertTextAt(into, state.schema, caret, content);
      into.step(replaceInlineStep(caret.block, caret.region, caret.offset, caret.offset, content));
      return { ...caret, offset: caret.offset + inlineLength(content) };
    });
    if (tr !== null) dispatch?.(tr);
    return tr !== null;
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
