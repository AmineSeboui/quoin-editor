import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'tsup';
import { withClientDirective } from './scripts/client-directive.mjs';
import { directiveFiles, tsupEntries } from './scripts/entry-outputs.mjs';
import { makeMapsPortable } from './scripts/portable-maps.mjs';
import { lazyChunks, packageEntries } from './scripts/package-entries.mjs';

// esbuild keeps the directive in ESM output but buries it behind the CJS prelude. It goes on a line of its own and
// the sourcemap gains an empty first line, so every mapped line keeps its source place.
async function ensureDirective(file: string) {
  const path = `dist/${file}`;
  const source = await readFile(path, 'utf8');
  const map = JSON.parse(await readFile(`${path}.map`, 'utf8'));
  const result = withClientDirective(source, map);
  if (result.code === source) return;
  await writeFile(path, result.code);
  await writeFile(`${path}.map`, JSON.stringify(result.map));
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
