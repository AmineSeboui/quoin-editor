import { readFile, writeFile } from 'node:fs/promises';
import { defineConfig } from 'tsup';

const clientEntries = ['index.js', 'index.cjs', 'headless.js', 'headless.cjs'];

// esbuild keeps the directive in ESM output but buries it behind the CJS prelude. It is prepended
// without a newline so the sourcemaps of those files keep their line numbers.
async function ensureDirective(file: string) {
  const path = `dist/${file}`;
  const source = await readFile(path, 'utf8');
  if (!/^['"]use client['"]/.test(source)) await writeFile(path, `'use client';${source}`);
}

// treeshake stays off: Rollup strips module-level directives.
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    headless: 'src/headless.ts',
    engine: 'src/engine/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: false,
  external: ['react', 'react-dom', 'yjs'],
  onSuccess: async () => {
    await Promise.all(clientEntries.map(ensureDirective));
  },
});
