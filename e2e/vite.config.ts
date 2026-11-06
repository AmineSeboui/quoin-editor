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
  const port = built ? 5180 : 5179;
  return {
    // The bundled harness keeps React's development build, the one the dev server serves: a production React
    // changes typing latency enough to move the ratios the performance budgets are held to.
    define: { 'process.env.NODE_ENV': JSON.stringify('development') },
    root: here('./app'),
    cacheDir: here(built ? '../node_modules/.vite-dist' : '../node_modules/.vite'),
    plugins: [react()],
    resolve: {
      alias: [
        { find: 'quoin-editor/styles.css', replacement: here('../dist/styles.css') },
        ...(built ? builtAliases : entryAliases),
      ],
    },
    build: {
      outDir: here(built ? '../node_modules/.harness-dist' : '../node_modules/.harness'),
      emptyOutDir: true,
      // A failing run is read from its trace, so the bundle keeps the names and the lines of the source it came from.
      minify: false,
      sourcemap: true,
      rollupOptions: {
        input: [here('./app/index.html'), here('./app/docx.html')],
        // A spec intercepts the emoji dataset by name, so it is held in a chunk named here rather than by the
        // bundler, whose names differ between platforms, and no cache-busting hash stands in the way.
        output: {
          chunkFileNames: 'assets/[name].js',
          entryFileNames: 'assets/[name].js',
          manualChunks: (id: string) => (/emoji[\\/]data\.ts$|emoji-data\.js$/.test(id) ? 'emoji-data' : undefined),
        },
      },
    },
    server: { port, strictPort: true },
    preview: { port, strictPort: true },
  };
});
