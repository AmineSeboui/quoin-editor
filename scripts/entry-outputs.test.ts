// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import tsupConfig from '../tsup.config';
import { directiveFiles, packageExports, specifier, tsupEntries } from './entry-outputs.mjs';
import { featureEntries, incrementalBudget, lazyChunks, packageEntries } from './package-entries.mjs';

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

  it('drives the entries tsup builds, with the chunks loaded on demand, and the declarations of the entries only', () => {
    expect(tsupConfig).toMatchObject({
      entry: tsupEntries([...packageEntries, ...lazyChunks]),
      dts: { entry: tsupEntries(packageEntries) },
    });
  });

  it('exports none of the chunks loaded on demand, which build under names no entry has', () => {
    const names = new Set(packageEntries.map(({ name }) => name));
    expect(lazyChunks.filter(({ name }) => names.has(name) || `./${name}` in manifest.exports)).toEqual([]);
    expect(lazyChunks.every(({ total }) => Number.isInteger(total) && total > 0)).toBe(true);
  });

  it('keeps the absolute budgets of the main, headless and engine entries, and of the view, diff and docx a server loads alone', () => {
    const totals = packageEntries.filter((entry) => entry.total !== undefined).map(({ name, total }) => [name, total]);
    expect(totals).toEqual([
      ['index', 155_500],
      ['headless', 70_400],
      ['engine', 52_000],
      ['view', 22_214],
      ['diff', 26_961],
      ['docx', 25_891],
    ]);
    expect(packageEntries[3]).toMatchObject({ source: 'src/view-static/index.ts', client: false });
    expect(packageEntries[4]).toMatchObject({ source: 'src/diff/index.ts', client: false });
    expect(packageEntries[5]).toMatchObject({ source: 'src/docx/index.ts', client: false });
  });

  it('sets an incremental budget at the measure plus 4 percent, and never less than 256 B above it', () => {
    expect(incrementalBudget(70)).toBe(326);
    expect(incrementalBudget(6_400)).toBe(6_656);
    expect(incrementalBudget(10_000)).toBe(10_400);
    expect(incrementalBudget(9_999)).toBe(10_399);
  });

  it('publishes the Yjs adapter, presence, comments, AI, every feature, then the catalogue, held to what they add', () => {
    const optIn = packageEntries.slice(6);
    expect(optIn.map(({ name }) => name)).toEqual([
      'yjs',
      'presence',
      'comments',
      'ai',
      ...featureEntries.map(({ name }) => name),
      'catalogue',
    ]);
    expect(optIn[0]).toMatchObject({ source: 'src/yjs.ts', client: false });
    expect(optIn[1]).toMatchObject({ source: 'src/presence.ts', client: true });
    expect(optIn[2]).toMatchObject({ source: 'src/comments.ts', client: true });
    expect(optIn[3]).toMatchObject({ source: 'src/ai.ts', client: true });
    expect(optIn.slice(1).every(({ client }) => client)).toBe(true);
    expect(optIn.at(-1)).toMatchObject({ source: 'src/catalogue.ts', client: true });
    expect(optIn.every(({ added }) => Number.isInteger(added) && Number(added) > 0)).toBe(true);
  });
});

const sourceOf = (path: string) => readFileSync(resolve(__dirname, '..', path), 'utf8');
const importsOf = (code: string) => [...code.matchAll(/^import\s[\s\S]*?['"]([^'"]+)['"];/gm)].map(([, path]) => path);

// A feature that reaches only some modules of the main entry makes the bundler split the main entry's chunks around
// them, which reorders the main entry's code and grows its gzip by hundreds of bytes with no change to it.
describe('the sources of the opt-in entries', () => {
  it.each(
    [
      ...featureEntries,
      { name: 'presence', source: 'src/presence.ts' },
      { name: 'comments', source: 'src/comments.ts' },
      { name: 'ai', source: 'src/ai.ts' },
    ].map(({ name, source }) => [name, source]),
  )('%s starts with the client directive, then imports the whole main entry', (_, source) => {
    const code = sourceOf(source);
    expect(code.startsWith("'use client';\n")).toBe(true);
    expect(importsOf(code)[0]).toBe('./index');
  });

  it('include the Yjs adapter, which reaches no client code: no directive, and the whole engine entry first', () => {
    const code = sourceOf('src/yjs.ts');
    expect(code).not.toMatch(/['"]use client['"]/);
    expect(importsOf(code)[0]).toBe('./engine/index');
  });

  it('gather in the catalogue through each feature entry, and nothing else', () => {
    const own = ['./engine', './extensions/create-catalogue'];
    const features = importsOf(sourceOf('src/catalogue.ts')).filter((path) => !own.includes(path));
    expect(features.sort()).toEqual(featureEntries.map(({ name }) => `./${name}`).sort());
  });
});
