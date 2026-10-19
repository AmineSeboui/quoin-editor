// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import tsupConfig from '../tsup.config';
import { directiveFiles, packageExports, specifier, tsupEntries } from './entry-outputs.mjs';
import { catalogueBudget, featureEntries, packageEntries } from './package-entries.mjs';

const entries = [
  { name: 'index', source: 'src/index.ts', client: true, total: 1_000 },
  { name: 'engine', source: 'src/engine/index.ts', client: false, total: 500 },
  { name: 'table', source: 'src/table.ts', client: true, added: 200 },
  { name: 'emoji', source: 'src/emoji/index.ts', client: false, added: 300 },
];

const manifest = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));

describe('the outputs of an entry list', () => {
  it('give tsup one entry per name', () => {
    expect(tsupEntries(entries)).toEqual({
      index: 'src/index.ts',
      engine: 'src/engine/index.ts',
      table: 'src/table.ts',
      emoji: 'src/emoji/index.ts',
    });
  });

  it('export the main entry at the root and every other at its name, both as ES modules and CommonJS', () => {
    const exports: Record<string, unknown> = packageExports(entries);
    expect(Object.keys(exports)).toEqual(['.', './engine', './table', './emoji', './styles.css', './package.json']);
    expect(exports['./table']).toEqual({
      import: { types: './dist/table.d.ts', default: './dist/table.js' },
      require: { types: './dist/table.d.cts', default: './dist/table.cjs' },
    });
    expect(exports['.']).toMatchObject({ import: { default: './dist/index.js' } });
    expect(specifier(entries[0])).toBe('quoin-editor');
    expect(specifier(entries[2])).toBe('quoin-editor/table');
  });

  it('expect the directive on the built files of client entries only', () => {
    expect(directiveFiles(entries, true)).toEqual(['index.js', 'index.cjs', 'table.js', 'table.cjs']);
    expect(directiveFiles(entries, false)).toEqual(['engine.js', 'engine.cjs', 'emoji.js', 'emoji.cjs']);
  });
});

describe('the package entry list', () => {
  it('drives the exports of package.json, which npm run sync:exports rewrites', () => {
    expect(manifest.exports).toEqual(packageExports(packageEntries));
  });

  it('drives the entries tsup builds', () => {
    expect(tsupConfig).toMatchObject({ entry: tsupEntries(packageEntries) });
  });

  it('keeps the absolute budgets of the main, headless and engine entries', () => {
    const totals = packageEntries.filter((entry) => entry.total !== undefined).map(({ name, total }) => [name, total]);
    expect(totals).toEqual([
      ['index', 155_000],
      ['headless', 70_000],
      ['engine', 52_000],
    ]);
  });

  it('publishes the catalogue as a client entry whose budget grows with every feature it gathers', () => {
    const catalogue = packageEntries.find((entry) => entry.name === 'catalogue');
    expect(catalogue).toMatchObject({ source: 'src/catalogue.ts', client: true, added: catalogueBudget(featureEntries) });
    expect(catalogueBudget([{ added: 200 }, { added: 300 }])).toBe(catalogueBudget([]) + 500);
  });
});
