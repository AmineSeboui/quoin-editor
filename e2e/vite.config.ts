import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: here('./app'),
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'quoin-editor/styles.css', replacement: here('../dist/styles.css') },
      { find: /^quoin-editor\/(.*)$/, replacement: here('../src/$1') },
      { find: /^quoin-editor$/, replacement: here('../src/index.ts') },
    ],
  },
  server: { port: 5179, strictPort: true },
});
