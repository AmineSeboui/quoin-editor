import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'tsup';
import { directiveFiles, tsupEntries } from './scripts/entry-outputs.mjs';
import { makeMapsPortable } from './scripts/portable-maps.mjs';
import { lazyChunks, packageEntries } from './scripts/package-entries.mjs';

// esbuild keeps the directive in ESM output but buries it behind the CJS prelude. It is prepended
// without a newline so the sourcemaps of those files keep their line numbers.
async function ensureDirective(file: string) {
  const path = `dist/${file}`;
  const source = await readFile(path, 'utf8');
  if (!/^['"]use client['"]/.test(source)) await writeFile(path, `'use client';${source}`);
}

// esbuild already drops unused modules; the Rollup pass of treeshake merges a chunk's imports and drops the arguments
// no caller passes. Rollup strips module-level directives, so ensureDirective puts 'use client' back afterwards.
export default defineConfig({
  entry: tsupEntries([...packageEntries, ...lazyChunks]),
  format: ['esm', 'cjs'],
  dts: { entry: tsupEntries(packageEntries) },
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  external: ['react', 'react-dom', 'yjs'],
  onSuccess: async () => {
    await Promise.all(directiveFiles(packageEntries, true).map(ensureDirective));
    await makeMapsPortable(resolve('dist'));
  },
});
