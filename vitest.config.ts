import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const environment = {
  globals: true,
  environment: 'jsdom' as const,
  css: { include: [/\.css\?raw$/] },
  setupFiles: ['./vitest.setup.ts'],
};

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: [
        'src/engine/**/*.ts',
        'src/view/**/*.{ts,tsx}',
        'src/blocks/**/*.{ts,tsx}',
        'src/ui/**/*.{ts,tsx}',
        'src/hooks/**/*.{ts,tsx}',
        'src/canvas/**/*.{ts,tsx}',
        'src/menus/**/*.{ts,tsx}',
        'src/context.tsx',
        'src/i18n/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/engine/**/*.test.ts',
        'src/engine/index.ts',
        'src/engine/test-support/**',
        'src/engine/**/*-arbitrary.ts',
        'src/**/*.test.{ts,tsx}',
        'src/blocks/test-support/test-canvas.tsx',
        'src/hooks/test-autosave.tsx',
        'src/ui/test-class-lists.ts',
        'src/view/clipboard/test-transfer.ts',
        'src/view/controller/test-controller.ts',
        'src/view/react/test-harness.tsx',
      ],
      thresholds: {
        'src/engine/**': { lines: 90, functions: 90, branches: 85, statements: 90 },
        'src/view/**': { lines: 95 },
        'src/blocks/**': { lines: 97 },
        'src/ui/**': { lines: 98 },
        'src/hooks/**': { lines: 98 },
        'src/context.tsx': { lines: 98 },
        'src/canvas/**': { lines: 97 },
        'src/menus/**': { lines: 97 },
        'src/i18n/**': { lines: 98 },
      },
      reporter: ['text-summary', 'html', 'json'],
    },
    projects: [
      {
        test: {
          ...environment,
          name: 'without-dom',
          // The engine, the collaboration layer and the build scripts run without a DOM, so their tests do too, which
          // spares each of them a jsdom and fails if one of them reaches for the document. The dozen that parse or
          // write HTML go through the browser's own parser and ask for a DOM in a docblock.
          environment: 'node',
          include: ['src/engine/**/*.test.ts', 'src/yjs/**/*.test.ts', 'scripts/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        test: {
          ...environment,
          name: 'dom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, 'src/engine/**/*.test.ts', 'src/yjs/**/*.test.ts'],
        },
      },
    ],
  },
});
