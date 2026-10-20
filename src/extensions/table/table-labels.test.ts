import { englishTableLabels, resolveTableLabels } from './table-labels';

describe('the table labels', () => {
  it('are English by default, counting rows and columns from 1', () => {
    const labels = resolveTableLabels();
    expect(labels).toBe(englishTableLabels);
    expect(labels.cell(2, 3)).toBe('Row 2, column 3');
    expect(labels.rowOptions(1)).toBe('Row 1 options');
    expect(labels.columnOptions(4)).toBe('Column 4 options');
    expect(labels.insertRowAt(3)).toBe('Insert row 3');
    expect(labels.insertColumnAt(2)).toBe('Insert column 2');
    expect(labels.resizeColumn(1)).toBe('Resize column 1');
    expect(labels.columnWidth(120)).toBe('120 pixels');
  });

  it('take the host overrides, and keep English for a key left out or undefined', () => {
    const labels = resolveTableLabels({ table: 'Tableau', deleteRow: undefined, cell: (row, col) => `Ligne ${row}, colonne ${col}` });
    expect(labels.table).toBe('Tableau');
    expect(labels.cell(1, 2)).toBe('Ligne 1, colonne 2');
    expect(labels.deleteRow).toBe('Delete row');
    expect(resolveTableLabels({ table: undefined })).toBe(englishTableLabels);
  });

  it('name every control with a non-empty string', () => {
    const values = Object.values(englishTableLabels).map((value) => (typeof value === 'function' ? value(1, 1) : value));
    expect(values.every((value) => typeof value === 'string' && value.trim() !== '')).toBe(true);
  });
});
