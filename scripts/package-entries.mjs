export const MAIN_ENTRY = 'index';

/**
 * An entry of the package: `total` is the gzip budget of a core entry, `added` the gzip an opt-in entry may add to the
 * main entry.
 * @typedef {{ name: string, source: string, client: boolean, total?: number, added?: number }} PackageEntry
 */

const GZIP_JITTER_FLOOR = 256;

/**
 * The budget for an entry measured to add `measured` gzip bytes to the main entry: 4 percent above it, and at least
 * 256 B above it, since unrelated changes to the main entry move a small entry's measure by a few bytes.
 */
export const incrementalBudget = (measured) => Math.max(Math.round(measured * 1.04), measured + GZIP_JITTER_FLOOR);

/**
 * Opt-in subpath entries, and `npm run sync:exports` writes the list into package.json. `added` is the gzip an entry
 * may add to the main entry, `incrementalBudget` of its measure when it lands. The catalogue gathers every feature, so a
 * task that adds a feature measures the catalogue again and sets its budget the same way. A feature's source imports
 * the main entry and the catalogue imports the feature's source, as src/table.ts explains.
 * @type {PackageEntry[]}
 */
export const featureEntries = [
  { name: 'table', source: 'src/table.ts', client: true, added: incrementalBudget(9_461) },
  { name: 'embed', source: 'src/embed.ts', client: true, added: incrementalBudget(4_499) },
  { name: 'math', source: 'src/math.ts', client: true, added: incrementalBudget(3_785) },
];

/** @type {PackageEntry[]} */
export const packageEntries = [
  { name: MAIN_ENTRY, source: 'src/index.ts', client: true, total: 155_000 },
  { name: 'headless', source: 'src/headless.ts', client: true, total: 70_000 },
  { name: 'engine', source: 'src/engine/index.ts', client: false, total: 52_000 },
  ...featureEntries,
  { name: 'catalogue', source: 'src/catalogue.ts', client: true, added: incrementalBudget(16_995) },
];
