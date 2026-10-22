// @vitest-environment node
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addedGzip, measureEntries, totalGzip } from './measure-size.mjs';

const noise = (seed: string, blocks: number) =>
  Array.from({ length: blocks }, (_, i) => createHash('sha256').update(`${seed}${i}`).digest('hex')).join('');

const shared = noise('shared', 100);
const own = noise('own', 20);
const heavy = noise('heavy', 200);
let root = '';

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'quoin-size-'));
  mkdirSync(join(root, 'dist'));
  const files: Record<string, string> = {
    'chunk.js': `export const shared = ${JSON.stringify(shared)};`,
    'index.js': "import { shared } from './chunk.js';\nexport const main = () => shared;",
    'feature.js': `import { shared } from './chunk.js';\nexport const feature = () => shared + ${JSON.stringify(own)};`,
    'lean.js': "import { shared } from './chunk.js';\nexport const lean = () => shared.length;",
    'heavy.js': `export const heavy = ${JSON.stringify(heavy)};`,
    'lazy.js': "import { shared } from './chunk.js';\nexport const lazy = () => import('./heavy.js').then((m) => shared + m.heavy);",
  };
  for (const [name, content] of Object.entries(files)) writeFileSync(join(root, 'dist', name), content);
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('the incremental size of a feature entry', () => {
  it('counts the code the feature adds to the main entry, not the chunk they share', async () => {
    const added = await addedGzip(root, 'feature');
    const ownGzip = gzipSync(own).length;
    expect(added).toBeGreaterThan(ownGzip * 0.9);
    expect(added).toBeLessThan(ownGzip + 150);
    expect(await totalGzip(root, 'feature')).toBeGreaterThan(added + gzipSync(shared).length * 0.9);
  });

  it('is next to nothing for a feature that only reuses what the main entry has', async () => {
    expect(await addedGzip(root, 'lean')).toBeLessThan(60);
  });

  it('counts the code two features share once when they are loaded together', async () => {
    const [feature, together] = [await addedGzip(root, 'feature'), await addedGzip(root, ['feature', 'lazy'])];
    expect(together).toBeLessThan(feature + 200);
    expect(together).toBeGreaterThan(feature);
  });
});

describe('measureEntries', () => {
  it('holds each entry to its total or its added budget', async () => {
    const results = await measureEntries(root, [
      { name: 'index', total: 100_000 },
      { name: 'feature', added: 100 },
      { name: 'lean', added: 100 },
    ]);
    expect(results.map(({ name, kind, budget, ok }) => ({ name, kind, budget, ok }))).toEqual([
      { name: 'index', kind: 'total', budget: 100_000, ok: true },
      { name: 'feature', kind: 'added', budget: 100, ok: false },
      { name: 'lean', kind: 'added', budget: 100, ok: true },
    ]);
    expect(results[0].gzip).toBe(await totalGzip(root, 'index'));
    expect(results[1].gzip).toBe(await addedGzip(root, 'feature'));
  });
});

const outline = (results: Awaited<ReturnType<typeof measureEntries>>) =>
  results.map(({ name, kind, budget, ok }) => ({ name, kind, budget, ok }));

describe('an entry that loads a chunk on demand', () => {
  it('is measured without that chunk, which is measured on its own', async () => {
    const heavyGzip = gzipSync(heavy).length;
    expect(await addedGzip(root, 'lazy')).toBeLessThan(200);
    expect(await totalGzip(root, 'lazy')).toBeLessThan(gzipSync(shared).length + 200);
    expect(await totalGzip(root, 'heavy')).toBeGreaterThan(heavyGzip * 0.9);
    expect(await totalGzip(root, 'heavy')).toBeLessThan(heavyGzip + 150);
  });

  it('holds the chunk to its own budget', async () => {
    const results = await measureEntries(root, [{ name: 'lazy', added: 1_000 }], [{ name: 'heavy', total: 100 }]);
    expect(outline(results)).toEqual([
      { name: 'lazy', kind: 'added', budget: 1_000, ok: true },
      { name: 'heavy', kind: 'lazy', budget: 100, ok: false },
    ]);
    expect(results[1].gzip).toBe(await totalGzip(root, 'heavy'));
  });

  it('fails a chunk it loads that has no budget of its own', async () => {
    const results = await measureEntries(root, [{ name: 'index', total: 100_000 }, { name: 'lazy', added: 1_000 }]);
    expect(outline(results)).toEqual([
      { name: 'index', kind: 'total', budget: 100_000, ok: true },
      { name: 'lazy', kind: 'added', budget: 1_000, ok: true },
      { name: 'heavy', kind: 'lazy', budget: undefined, ok: false },
    ]);
  });

  it('fails a chunk that a chunk loaded on demand loads in turn with no budget of its own', async () => {
    const results = await measureEntries(root, [], [{ name: 'lazy', total: 10_000 }]);
    expect(outline(results)).toEqual([
      { name: 'lazy', kind: 'lazy', budget: 10_000, ok: true },
      { name: 'heavy', kind: 'lazy', budget: undefined, ok: false },
    ]);
  });
});
