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
  { name: 'math', source: 'src/math.ts', client: true, added: incrementalBudget(4_421) },
  { name: 'toc', source: 'src/toc.ts', client: true, added: incrementalBudget(1_803) },
  { name: 'mention', source: 'src/mention.ts', client: true, added: incrementalBudget(2_837) },
  { name: 'emoji', source: 'src/emoji.ts', client: true, added: incrementalBudget(3_149) },
  { name: 'find', source: 'src/find.ts', client: true, added: incrementalBudget(4_020) },
  { name: 'stats', source: 'src/stats.ts', client: true, added: incrementalBudget(1_742) },
];

/**
 * Chunks an entry loads on demand with a dynamic import, built under a name of their own so they can be held to a
 * budget, and published with the package but exported from none of its entries. `total` is the gzip budget of the chunk
 * on its own, which the entry that loads it leaves out of its measure.
 * @type {{ name: string, source: string, total: number }[]}
 */
export const lazyChunks = [{ name: 'emoji-data', source: 'src/emoji/index.ts', total: 60_000 }];

/** @type {PackageEntry[]} */
export const packageEntries = [
  { name: MAIN_ENTRY, source: 'src/index.ts', client: true, total: 155_000 },
  { name: 'headless', source: 'src/headless.ts', client: true, total: 70_000 },
  { name: 'engine', source: 'src/engine/index.ts', client: false, total: 52_000 },
  // Read-only React for a server, which loads it alone: the markdown parser it shares with the engine is most of it.
  { name: 'view', source: 'src/view-static/index.ts', client: false, total: 22_214 },
  // The changes between two versions, drawn with the view's node tree: loaded alone, like the view.
  { name: 'diff', source: 'src/diff/index.ts', client: false, total: 26_961 },
  // Word documents written in a browser, a worker or Node, loaded alone like the view: most of it is the block reading.
  { name: 'docx', source: 'src/docx/index.ts', client: false, total: 25_891 },
  // Measured as what it adds to the main entry, like a feature: the engine entry it loads is a part of the main entry.
  { name: 'yjs', source: 'src/yjs.ts', client: false, added: incrementalBudget(8_111) },
  // Collaborators drawn in the canvas: a client entry, apart from the adapter, which a worker or a server can load alone.
  { name: 'presence', source: 'src/presence.ts', client: true, added: incrementalBudget(4_534) },
  // Threads the host keeps, which no catalogue option could carry, so it stays out of the catalogue as presence does.
  { name: 'comments', source: 'src/comments.ts', client: true, added: incrementalBudget(6_560) },
  // The host's model streams through a callback no catalogue option could carry, so it stays out as comments do.
  { name: 'ai', source: 'src/ai.ts', client: true, added: incrementalBudget(8_417) },
  ...featureEntries,
  { name: 'catalogue', source: 'src/catalogue.ts', client: true, added: incrementalBudget(28_865) },
];
