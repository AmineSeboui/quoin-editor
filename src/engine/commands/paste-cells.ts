import { cellOf, cellsBetween } from '../blocks/table-cell';
import { cellKey } from '../blocks/table-spec';
import { inlineLength } from '../model/inline';
import { orderedRange } from '../model/position';
import type { EngineBlock, Pos } from '../model/types';
import { textSelection } from '../state/selection';
import { Transaction } from '../state/transaction';
import { replaceBlockStep } from '../transform/block-steps';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { regionLength } from './block-helpers';
import type { Command } from './command';
import { deleteRange } from './delete-range';
import { columnAligns, rebuiltTable, storedWidths, tableBlock, tableShape } from './table-shape';

const unmoved = <T>(cell: T): T => cell;

// New columns are unaligned and as wide as the last column was, as a column added after it would be.
function grown(block: EngineBlock, rows: number, cols: number): EngineBlock | null {
  const shape = tableShape(block);
  if (rows <= shape.rows && cols <= shape.cols) return null;
  const added = Math.max(cols - shape.cols, 0);
  const widths = storedWidths(block, shape.cols);
  return rebuiltTable(block, {
    rows: Math.max(rows, shape.rows),
    cols: shape.cols + added,
    source: (row, col) => (row < shape.rows && col < shape.cols ? [row, col] : null),
    target: unmoved,
    landing: unmoved,
    attrs: {
      align: [...columnAligns(block, shape.cols), ...Array<null>(added).fill(null)],
      ...(widths && { widths: [...widths, ...Array<number>(added).fill(widths[shape.cols - 1])] }),
    },
  });
}

/**
 * Writes the cells of `source`, a table, into the table the selection is in, from the first cell of a cell range or
 * from the cell holding the caret: the range is emptied first, the cells written over what they held, and the table
 * grows the rows and columns they reach past. The caret ends after the last of them.
 */
export function pasteCells(source: EngineBlock): Command {
  return (state, dispatch) => {
    const { doc, schema, selection } = state;
    const { rows, cols } = tableShape(source);
    if (selection?.kind !== 'text' || rows === 0 || cols === 0) return false;
    const { anchor, head } = selection;
    const inCells = anchor.block === head.block && cellOf(anchor.region) !== null && cellOf(head.region) !== null;
    if (!inCells || tableBlock(doc, head.block) === null) return false;
    const tr = new Transaction(state).setOrigin('paste');
    const { from, to } = orderedRange(doc, anchor, head);
    const [top, left] = cellOf(deleteRange(tr, schema, from, to).region)!;
    const larger = grown(tableBlock(tr.doc, head.block)!, top + rows, left + cols);
    if (larger !== null) tr.step(replaceBlockStep(larger));
    const block = tableBlock(tr.doc, head.block)!;
    let caret: Pos = head;
    for (const [row, col] of cellsBetween([0, 0], [rows - 1, cols - 1])) {
      const region = cellKey(top + row, left + col);
      const content = source.regions[cellKey(row, col)] ?? [];
      const length = regionLength(block, region);
      if (length > 0 || content.length > 0) tr.step(replaceInlineStep(block.id, region, 0, length, content));
      caret = { block: block.id, region, offset: inlineLength(content) };
    }
    dispatch?.(tr.setSelection(textSelection(caret)));
    return true;
  };
}
