import { cellKey } from '../../engine/blocks/table-spec';
import { tableShape } from '../../engine/commands/table-shape';
import { equalInline } from '../../engine/model/inline';
import { sameItems } from '../../engine/model/same-items';
import type { EngineBlock, Inline } from '../../engine';
import type { TableTarget } from './use-table-target';

type Axis = 'row' | 'column';

const EMPTY: Inline = [];

/** The cells of the row or the column at `index`, as the handles draw them. */
function lineCells(block: EngineBlock, index: number, axis: Axis): Inline[] {
  const { rows, cols } = tableShape(block);
  return Array.from({ length: axis === 'row' ? cols : rows }, (_, other) =>
    axis === 'row' ? (block.regions[cellKey(index, other)] ?? EMPTY) : (block.regions[cellKey(other, index)] ?? EMPTY),
  );
}

const sameLine = (before: EngineBlock, after: EngineBlock, index: number, axis: Axis) =>
  sameItems(lineCells(before, index, axis), lineCells(after, index, axis), equalInline);

/**
 * Whether the row or the column a menu was opened for still sits at its index. Its items act on that index, so a change
 * that moved it, such as a row a collaborator inserted above, closes the menu. Rows and columns have no identity, so a
 * change to its cells counts as typing in it only while every other row or column stayed as it was.
 */
export function sameMenuCells(opened: EngineBlock, current: EngineBlock, target: TableTarget, axis: Axis): boolean {
  const shape = tableShape(opened);
  const lines = axis === 'row' ? shape.rows : shape.cols;
  const index = Math.min(axis === 'row' ? target.row : target.col, lines - 1);
  if (sameLine(opened, current, index, axis)) return true;
  const reshaped = tableShape(current);
  if (reshaped.rows !== shape.rows || reshaped.cols !== shape.cols) return false;
  const others = Array.from({ length: lines }, (_, other) => other);
  return others.every((other) => other === index || sameLine(opened, current, other, axis));
}
