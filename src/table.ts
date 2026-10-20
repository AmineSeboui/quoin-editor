'use client';

// The whole main entry, so that the bundler splits none of its chunks around the modules this entry shares with it,
// which would reorder the main entry's code and cost it hundreds of bytes of gzip.
import './index';

export { tableExtension, type TableOptions } from './extensions/table/table-extension';
export { englishTableLabels, type TableLabels } from './extensions/table/table-labels';
export {
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
} from './engine/commands/table-commands';
export type { Cell, ColumnAlign } from './engine/commands/table-shape';
export {
  cellSelection,
  cellSelectionKey,
  cellSelectionPlugin,
  cellsInRange,
  selectCells,
  type CellRange,
} from './engine/state/cell-selection';
export { deleteCellContents, setCellsMark } from './engine/commands/cell-commands';
