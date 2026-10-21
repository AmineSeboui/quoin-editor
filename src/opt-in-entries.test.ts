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
  embed: { load: () => import('./embed'), exports: ['embedExtension', 'englishEmbedLabels'] },
  math: { load: () => import('./math'), exports: ['mathExtension', 'englishMathLabels'] },
  toc: { load: () => import('./toc'), exports: ['tocExtension', 'englishTocLabels', 'headings'] },
  mention: { load: () => import('./mention'), exports: ['mentionExtension', 'englishMentionLabels'] },
  emoji: { load: () => import('./emoji'), exports: ['emojiExtension', 'englishEmojiLabels', 'loadEmojiData'] },
  find: { load: () => import('./find'), exports: ['findExtension', 'englishFindLabels', 'findMatches', 'replaceMatches'] },
  catalogue: { load: () => import('./catalogue'), exports: ['catalogue'] },
};

const ENTRY_IMPORT_TIMEOUT = 60_000;

const optIn = packageEntries.filter((entry) => entry.added !== undefined).map(({ name }) => name);

describe('the opt-in entries', () => {
  it('each pin the names they export at runtime', () => {
    expect(optIn).toEqual(Object.keys(PINNED));
  });

  // Each entry is imported cold, the whole main entry with it, which takes seconds on a loaded machine.
  it.each(optIn)(
    '%s exports its pinned names and nothing else',
    async (name) => {
      const entry = PINNED[name];
      expect(Object.keys(await entry.load()).sort()).toEqual([...entry.exports].sort());
    },
    ENTRY_IMPORT_TIMEOUT,
  );
});
