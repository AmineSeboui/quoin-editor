import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { devPages } from './dev-pages.ts';

const base = '/quoin-editor/';

export default defineConfig({
  base,
  plugins: [react(), devPages(base)],
  // quoin-editor is linked from the repository root, whose own node_modules hold another React and Yjs.
  resolve: { dedupe: ['react', 'react-dom', 'yjs'] },
  build: { emptyOutDir: true },
});
