import { cellKey } from '../../engine/blocks/table-spec';
import { tableShape } from '../../engine/commands/table-shape';
import { equalInline } from '../../engine/model/inline';
import type { EngineBlock, Inline } from '../../engine';
import type { TableTarget } from './use-table-target';

const EMPTY: Inline = [];

/** The cells of the row or the column a handle's menu acts on, by its index, as the handles draw it. */
function menuCells(block: EngineBlock, target: TableTarget, axis: 'row' | 'column'): Inline[] {
  const { rows, cols } = tableShape(block);
  const row = Math.min(target.row, rows - 1);
  const col = Math.min(target.col, cols - 1);
  return Array.from({ length: axis === 'row' ? cols : rows }, (_, index) =>
    axis === 'row' ? (block.regions[cellKey(row, index)] ?? EMPTY) : (block.regions[cellKey(index, col)] ?? EMPTY),
  );
}

/**
 * Whether the row or the column a menu was opened for still sits at its index. Its items act on that index, so a change
 * that moved it, such as a row a collaborator inserted above, or that changed its cells, closes the menu.
 */
export function sameMenuCells(opened: EngineBlock, current: EngineBlock, target: TableTarget, axis: 'row' | 'column'): boolean {
  const before = menuCells(opened, target, axis);
  const after = menuCells(current, target, axis);
  return before.length === after.length && before.every((cell, index) => equalInline(cell, after[index]));
}
