import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const budgets = [
  ['dist/index.js', 143_300],
  ['dist/headless.js', 69_500],
  ['dist/engine.js', 51_700],
];
const external = ['react', 'react-dom', 'react/jsx-runtime', 'yjs'];

let failed = false;
for (const [entry, budget] of budgets) {
  const result = await build({
    stdin: { contents: `export * from './${entry}';`, resolveDir: root, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    external,
    logLevel: 'silent',
  });
  const gzip = gzipSync(result.outputFiles[0].contents).length;
  const ok = gzip <= budget;
  failed ||= !ok;
  console.log(`${ok ? 'ok  ' : 'OVER'} ${entry} ${gzip} B gzip (budget ${budget})`);
}
if (failed) process.exit(1);
