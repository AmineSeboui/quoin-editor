import { resolve } from 'node:path';
import { measureEntries } from './measure-size.mjs';
import { MAIN_ENTRY, packageEntries } from './package-entries.mjs';

const root = resolve(import.meta.dirname, '..');
const results = await measureEntries(root, packageEntries);
for (const { name, kind, budget, gzip, ok } of results) {
  const measured = kind === 'total' ? 'gzip' : `gzip added to dist/${MAIN_ENTRY}.js`;
  console.log(`${ok ? 'ok  ' : 'OVER'} dist/${name}.js ${gzip} B ${measured} (budget ${budget})`);
}
if (results.some(({ ok }) => !ok)) process.exit(1);
