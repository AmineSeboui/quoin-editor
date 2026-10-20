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

async function gzipOf(root, contents, loaded) {
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
  return gzipSync(result.outputFiles[0].contents).length;
}

const built = (name) => `./dist/${name}.js`;

export const totalGzip = (root, name, loaded = new Set()) => gzipOf(root, `export * from '${built(name)}';`, loaded);

// Namespaces rather than two star exports: a name the two entries export differently would be ambiguous, and dropped
// with its code.
export async function addedGzip(root, name, loaded = new Set()) {
  const main = `export * as main from '${built(MAIN_ENTRY)}';`;
  const [alone, both] = await Promise.all([
    gzipOf(root, main, loaded),
    gzipOf(root, `${main}\nexport * as feature from '${built(name)}';`, loaded),
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
