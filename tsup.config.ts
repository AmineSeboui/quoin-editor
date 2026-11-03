import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'tsup';
import { withClientDirective } from './scripts/client-directive.mjs';
import { directiveFiles, tsupEntries } from './scripts/entry-outputs.mjs';
import { makeMapsPortable } from './scripts/portable-maps.mjs';
import { lazyChunks, packageEntries } from './scripts/package-entries.mjs';

// A file the CommonJS build writes, which carries no sourcemap of its own.
const EMPTY_MAP = { version: 3, file: '', sources: [], sourcesContent: [], names: [], mappings: '' };

const readMap = async (path: string) => {
  try {
    return JSON.parse(await readFile(`${path}.map`, 'utf8'));
  } catch {
    return null;
  }
};

// esbuild keeps the directive in ESM output but buries it behind the CJS prelude. It goes on a line of its own and
// the sourcemap gains an empty first line, so every mapped line keeps its source place. The CommonJS build ships no
// maps, so there the code is fixed and nothing is written beside it.
async function ensureDirective(file: string) {
  const path = `dist/${file}`;
  const source = await readFile(path, 'utf8');
  const map = await readMap(path);
  const result = withClientDirective(source, map ?? EMPTY_MAP);
  if (result.code === source) return;
  await writeFile(path, result.code);
  if (map !== null) await writeFile(`${path}.map`, JSON.stringify(result.map));
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
