export const MAIN_ENTRY = 'index';

/**
 * Opt-in subpath entries. `added` is the gzip each may add to the main entry, and `npm run sync:exports` writes the
 * list into package.json.
 */
export const featureEntries = [];

const CATALOGUE_OWN_BUDGET = 100;

export const catalogueBudget = (features) => features.reduce((sum, { added }) => sum + added, CATALOGUE_OWN_BUDGET);

export const packageEntries = [
  { name: MAIN_ENTRY, source: 'src/index.ts', client: true, total: 155_000 },
  { name: 'headless', source: 'src/headless.ts', client: true, total: 70_000 },
  { name: 'engine', source: 'src/engine/index.ts', client: false, total: 52_000 },
  ...featureEntries,
  { name: 'catalogue', source: 'src/catalogue.ts', client: true, added: catalogueBudget(featureEntries) },
];
