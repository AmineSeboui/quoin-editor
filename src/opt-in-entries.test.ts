import { packageEntries } from '../scripts/package-entries.mjs';

const PINNED: Readonly<Record<string, { load: () => Promise<object>; exports: readonly string[] }>> = {
  table: {
    load: () => import('./table'),
    exports: [
      'tableExtension',
      'englishTableLabels',
      'insertTable',
      'addRow',
      'removeRow',
      'addColumn',
      'removeColumn',
      'moveRow',
      'moveColumn',
      'toggleHeaderRow',
      'setColumnAlign',
      'setColumnWidth',
      'cellSelection',
      'cellSelectionKey',
      'cellSelectionPlugin',
      'cellsInRange',
      'selectCells',
      'deleteCellContents',
      'setCellsMark',
    ],
  },
  catalogue: { load: () => import('./catalogue'), exports: ['catalogue'] },
};

const optIn = packageEntries.filter((entry) => entry.added !== undefined).map(({ name }) => name);

describe('the opt-in entries', () => {
  it('each pin the names they export at runtime', () => {
    expect(optIn).toEqual(Object.keys(PINNED));
  });

  it.each(optIn)('%s exports its pinned names and nothing else', async (name) => {
    const entry = PINNED[name];
    expect(Object.keys(await entry.load()).sort()).toEqual([...entry.exports].sort());
  });
});
