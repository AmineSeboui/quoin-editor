import { resolve } from 'node:path';
import { measureEntries } from './measure-size.mjs';
import { lazyChunks, MAIN_ENTRY, packageEntries } from './package-entries.mjs';

const MEASURED = {
  total: 'gzip',
  added: `gzip added to dist/${MAIN_ENTRY}.js`,
  lazy: 'gzip on its own, loaded on demand',
};

const root = resolve(import.meta.dirname, '..');
const results = await measureEntries(root, packageEntries, lazyChunks);
for (const { name, kind, budget, gzip, ok } of results) {
  const limit = budget === undefined ? 'no budget' : `budget ${budget}`;
  console.log(`${ok ? 'ok  ' : 'OVER'} dist/${name}.js ${gzip} B ${MEASURED[kind]} (${limit})`);
}
if (results.some(({ ok }) => !ok)) process.exit(1);
