/** Every string the table feature shows or speaks. Rows and columns are counted from 1. */
export type TableLabels = {
  /** The slash command, and the name of a table. */
  table: string;
  tableDescription: string;
  cell(row: number, col: number): string;
  /** The toolbar Alt+F10 reaches from a cell, which holds the handles of the caret's row and column. */
  tableControls: string;
  rowOptions(row: number): string;
  columnOptions(col: number): string;
  insertRowAbove: string;
  insertRowBelow: string;
  insertColumnLeft: string;
  insertColumnRight: string;
  moveRowUp: string;
  moveRowDown: string;
  moveColumnLeft: string;
  moveColumnRight: string;
  deleteRow: string;
  deleteColumn: string;
  headerRow: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  /** The button on the edge between two rows or columns, named after the row or column it inserts. */
  insertRowAt(row: number): string;
  insertColumnAt(col: number): string;
  resizeColumn(col: number): string;
  columnWidth(px: number): string;
  rowInserted: string;
  rowDeleted: string;
  rowMoved: string;
  columnInserted: string;
  columnDeleted: string;
  columnMoved: string;
};

export const englishTableLabels: TableLabels = {
  table: 'Table',
  tableDescription: 'Rows and columns of text',
  cell: (row, col) => `Row ${row}, column ${col}`,
  tableControls: 'Table controls',
  rowOptions: (row) => `Row ${row} options`,
  columnOptions: (col) => `Column ${col} options`,
  insertRowAbove: 'Insert row above',
  insertRowBelow: 'Insert row below',
  insertColumnLeft: 'Insert column left',
  insertColumnRight: 'Insert column right',
  moveRowUp: 'Move row up',
  moveRowDown: 'Move row down',
  moveColumnLeft: 'Move column left',
  moveColumnRight: 'Move column right',
  deleteRow: 'Delete row',
  deleteColumn: 'Delete column',
  headerRow: 'Header row',
  alignLeft: 'Align left',
  alignCenter: 'Align center',
  alignRight: 'Align right',
  insertRowAt: (row) => `Insert row ${row}`,
  insertColumnAt: (col) => `Insert column ${col}`,
  resizeColumn: (col) => `Resize column ${col}`,
  columnWidth: (px) => `${px} pixels`,
  rowInserted: 'Row inserted',
  rowDeleted: 'Row deleted',
  rowMoved: 'Row moved',
  columnInserted: 'Column inserted',
  columnDeleted: 'Column deleted',
  columnMoved: 'Column moved',
};

/** The English labels with the host's overrides on top. A key left out, or passed as undefined, stays English. */
export function resolveTableLabels(overrides?: Partial<TableLabels>): TableLabels {
  const given = Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishTableLabels : { ...englishTableLabels, ...Object.fromEntries(given) };
}
