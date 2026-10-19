export const MAIN_ENTRY = 'index';

const GZIP_JITTER_FLOOR = 256;

/**
 * The budget for an entry measured to add `measured` gzip bytes to the main entry: 4 percent above it, and at least
 * 256 B above it, since unrelated changes to the main entry move a small entry's measure by a few bytes.
 */
export const incrementalBudget = (measured) => Math.max(Math.round(measured * 1.04), measured + GZIP_JITTER_FLOOR);

/**
 * Opt-in subpath entries, and `npm run sync:exports` writes the list into package.json. `added` is the gzip an entry
 * may add to the main entry, `incrementalBudget` of its measure when it lands. The catalogue gathers every feature, so a
 * task that adds a feature measures the catalogue again and sets its budget the same way.
 */
export const featureEntries = [];

export const packageEntries = [
  { name: MAIN_ENTRY, source: 'src/index.ts', client: true, total: 155_000 },
  { name: 'headless', source: 'src/headless.ts', client: true, total: 70_000 },
  { name: 'engine', source: 'src/engine/index.ts', client: false, total: 52_000 },
  ...featureEntries,
  { name: 'catalogue', source: 'src/catalogue.ts', client: true, added: incrementalBudget(70) },
];
