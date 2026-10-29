import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { MAIN_ENTRY, packageEntries } from '../scripts/package-entries.mjs';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const aliasesTo = (fileOf: (entry: (typeof packageEntries)[number]) => string) =>
  packageEntries.map((entry) => ({
    find: new RegExp(`^quoin-editor${entry.name === MAIN_ENTRY ? '' : `/${entry.name}`}$`),
    replacement: here(`../${fileOf(entry)}`),
  }));

/** Each entry of the package, resolved to the source it is built from, so the harness imports what the package exports. */
export const entryAliases = aliasesTo(({ source }) => source);

/** Each entry of the package, resolved to the module `npm run build` writes, so the harness runs what a host installs. */
export const builtAliases = aliasesTo(({ name }) => `dist/${name}.js`);

/** The `dist` mode serves the harness over the built package, on a port of its own so it never reuses the source server. */
export default defineConfig(({ mode }) => {
  const built = mode === 'dist';
  return {
    root: here('./app'),
    cacheDir: here(built ? '../node_modules/.vite-dist' : '../node_modules/.vite'),
    plugins: [react()],
    resolve: {
      alias: [
        { find: 'quoin-editor/styles.css', replacement: here('../dist/styles.css') },
        ...(built ? builtAliases : entryAliases),
      ],
    },
    server: { port: built ? 5180 : 5179, strictPort: true },
  };
});
