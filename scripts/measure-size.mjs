import { build } from 'esbuild';
import { basename, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { MAIN_ENTRY } from './package-entries.mjs';

const EXTERNAL = ['react', 'react-dom', 'react/jsx-runtime', 'yjs'];

// Without code splitting esbuild would inline a dynamically imported file, so the chunk an entry loads on demand would
// count as part of it. Kept as an import, the chunk is left out and named, to be measured on its own.
const leaveDynamicImports = (loaded) => ({
  name: 'leave-dynamic-imports',
  setup(build) {
    build.onResolve({ filter: /.*/ }, ({ kind, path, resolveDir }) => {
      if (kind !== 'dynamic-import') return undefined;
      loaded.add(basename(resolve(resolveDir, path), '.js'));
      return { path, external: true };
    });
  },
});

async function bundle(root, contents, loaded) {
  const result = await build({
    stdin: { contents, resolveDir: root, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    external: EXTERNAL,
    plugins: [leaveDynamicImports(loaded)],
    logLevel: 'silent',
  });
  return result.outputFiles[0].contents;
}

const gzipOf = async (root, contents, loaded) => gzipSync(await bundle(root, contents, loaded)).length;

const built = (name) => `./dist/${name}.js`;

const whole = (name) => `export * from '${built(name)}';`;

/** The minified code of a built entry as it is measured, without the chunks it loads on demand. */
export const entryBundle = async (root, name) => new TextDecoder().decode(await bundle(root, whole(name), new Set()));

export const totalGzip = (root, name, loaded = new Set()) => gzipOf(root, whole(name), loaded);

// Namespaces rather than star exports: a name two entries export differently would be ambiguous, and dropped with its
// code.
const namespaces = (names) =>
  [names].flat().map((name, i) => `export * as feature${i === 0 ? '' : i} from '${built(name)}';`);

/** What an entry, or several loaded together, adds to the main entry in gzip, counting the code they share once. */
export async function addedGzip(root, names, loaded = new Set()) {
  const main = `export * as main from '${built(MAIN_ENTRY)}';`;
  const [alone, both] = await Promise.all([
    gzipOf(root, main, loaded),
    gzipOf(root, [main, ...namespaces(names)].join('\n'), loaded),
  ]);
  return both - alone;
}

/**
 * Each entry against its total or added budget, without the chunks it loads on demand, then each of those chunks on its
 * own against the budget `lazyChunks` gives it. A chunk an entry loads with no budget there fails.
 */
export async function measureEntries(root, entries, lazyChunks = []) {
  const loaded = new Set();
  const measured = await Promise.all(
    entries.map(async ({ name, total, added }) => {
      const kind = total === undefined ? 'added' : 'total';
      const budget = total ?? added;
      const gzip = kind === 'total' ? await totalGzip(root, name, loaded) : await addedGzip(root, name, loaded);
      return { name, kind, budget, gzip, ok: gzip <= budget };
    }),
  );
  const budgets = new Map(lazyChunks.map(({ name, total }) => [name, total]));
  // A set visits what is added to it while it is walked, so a chunk that a chunk loads is measured too.
  const chunks = new Set([...budgets.keys(), ...loaded]);
  const lazy = [];
  for (const name of chunks) {
    const budget = budgets.get(name);
    const gzip = await totalGzip(root, name, chunks);
    lazy.push({ name, kind: 'lazy', budget, gzip, ok: budget !== undefined && gzip <= budget });
  }
  return [...measured, ...lazy];
}
