import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'demo', 'node_modules', 'playwright-report', 'test-results', 'consumer-check', '.claude'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'react-hooks/exhaustive-deps': 'warn',
      // These three read a closure's body as though it ran during render, which the deferred callbacks here do not:
      // a latest ref read by a callback the anchor invokes to position itself, a useSyncExternalStore snapshot cached
      // in a memo local so it returns the same object until its contents change, an icon picked from a fixed set, and
      // a callback written onto the engine's own link object from a layout effect. Each was read at its call site.
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/static-components': 'off',
      // A warning, since reading focus or layout off the DOM after mount has no render-time equivalent, while state
      // that could be derived instead is worth seeing.
      'react-hooks/set-state-in-effect': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },
  {
    // A test reassigns a variable it declared outside the component to capture what a render did.
    files: ['**/*.test.{ts,tsx}', 'e2e/app/**'],
    rules: { 'react-hooks/globals': 'off' },
  },
  {
    files: ['vitest.setup.ts'],
    rules: { '@typescript-eslint/no-empty-object-type': 'off', '@typescript-eslint/no-unused-vars': 'off' },
  },
);
