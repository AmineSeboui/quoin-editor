import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { MAIN_ENTRY, packageEntries } from '../scripts/package-entries.mjs';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** Each entry of the package, resolved to the source it is built from, so the harness imports what the package exports. */
export const entryAliases = packageEntries.map(({ name, source }) => ({
  find: new RegExp(`^quoin-editor${name === MAIN_ENTRY ? '' : `/${name}`}$`),
  replacement: here(`../${source}`),
}));

export default defineConfig({
  root: here('./app'),
  plugins: [react()],
  resolve: {
    alias: [{ find: 'quoin-editor/styles.css', replacement: here('../dist/styles.css') }, ...entryAliases],
  },
  server: { port: 5179, strictPort: true },
});
