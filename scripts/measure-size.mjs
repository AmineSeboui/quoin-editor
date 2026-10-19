import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { MAIN_ENTRY } from './package-entries.mjs';

const EXTERNAL = ['react', 'react-dom', 'react/jsx-runtime', 'yjs'];

async function gzipOf(root, contents) {
  const result = await build({
    stdin: { contents, resolveDir: root, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    external: EXTERNAL,
    logLevel: 'silent',
  });
  return gzipSync(result.outputFiles[0].contents).length;
}

const built = (name) => `./dist/${name}.js`;

export const totalGzip = (root, name) => gzipOf(root, `export * from '${built(name)}';`);

// Namespaces rather than two star exports: a name the two entries export differently would be ambiguous, and dropped
// with its code.
export async function addedGzip(root, name) {
  const main = `export * as main from '${built(MAIN_ENTRY)}';`;
  const [alone, both] = await Promise.all([
    gzipOf(root, main),
    gzipOf(root, `${main}\nexport * as feature from '${built(name)}';`),
  ]);
  return both - alone;
}

export const measureEntries = (root, entries) =>
  Promise.all(
    entries.map(async ({ name, total, added }) => {
      const kind = total === undefined ? 'added' : 'total';
      const budget = total ?? added;
      const gzip = kind === 'total' ? await totalGzip(root, name) : await addedGzip(root, name);
      return { name, kind, budget, gzip, ok: gzip <= budget };
    }),
  );
