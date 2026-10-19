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
let root = '';

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'quoin-size-'));
  mkdirSync(join(root, 'dist'));
  const files: Record<string, string> = {
    'chunk.js': `export const shared = ${JSON.stringify(shared)};`,
    'index.js': "import { shared } from './chunk.js';\nexport const main = () => shared;",
    'feature.js': `import { shared } from './chunk.js';\nexport const feature = () => shared + ${JSON.stringify(own)};`,
    'lean.js': "import { shared } from './chunk.js';\nexport const lean = () => shared.length;",
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
