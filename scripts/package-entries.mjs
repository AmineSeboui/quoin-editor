export const MAIN_ENTRY = 'index';

/**
 * Opt-in subpath entries, and `npm run sync:exports` writes the list into package.json. `added` is the gzip an entry
 * may add to the main entry: its measure plus about 4 percent when it lands. The catalogue gathers every feature, so a
 * task that adds a feature measures and raises the catalogue's budget the same way.
 */
export const featureEntries = [];

export const packageEntries = [
  { name: MAIN_ENTRY, source: 'src/index.ts', client: true, total: 155_000 },
  { name: 'headless', source: 'src/headless.ts', client: true, total: 70_000 },
  { name: 'engine', source: 'src/engine/index.ts', client: false, total: 52_000 },
  ...featureEntries,
  { name: 'catalogue', source: 'src/catalogue.ts', client: true, added: 74 },
];
