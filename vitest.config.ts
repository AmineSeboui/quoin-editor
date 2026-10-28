import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    css: { include: [/\.css\?raw$/] },
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/engine/**/*.ts',
        'src/view/**/*.{ts,tsx}',
        'src/blocks/**/*.{ts,tsx}',
        'src/ui/**/*.{ts,tsx}',
        'src/hooks/**/*.{ts,tsx}',
        'src/context.tsx',
        'src/i18n/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/engine/**/*.test.ts',
        'src/engine/index.ts',
        'src/engine/test-support/**',
        'src/engine/**/*-arbitrary.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/test-*.{ts,tsx}',
      ],
      thresholds: {
        'src/engine/**': { lines: 90, functions: 90, branches: 85, statements: 90 },
        'src/view/**': { lines: 95 },
        'src/blocks/**': { lines: 97 },
        'src/ui/**': { lines: 98 },
        'src/hooks/**': { lines: 98 },
        'src/context.tsx': { lines: 98 },
        'src/i18n/**': { lines: 98 },
      },
      reporter: ['text-summary', 'html'],
    },
  },
});
