import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { builtDistAction, distEntries } from '../test/support/built-dist';

let created: string[] = [];
const folder = (...files: string[]) => {
  const dir = mkdtempSync(join(tmpdir(), 'quoin-dist-'));
  created.push(dir);
  for (const file of files) writeFileSync(join(dir, file), '');
  return dir;
};

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created = [];
});

describe('the built dist guard', () => {
  it('runs the tests when every file they need is built', () => {
    const dir = folder('a.js', 'b.js');
    expect(builtDistAction(['a.js'], { dir, entries: ['a.js', 'b.js'], env: {} })).toEqual({ action: 'run' });
    expect(builtDistAction(['a.js'], { dir, entries: ['a.js', 'b.js'], env: { CI: 'true' } })).toEqual({ action: 'run' });
  });

  it('skips the tests when a file is missing and no CI is set', () => {
    const dir = folder('a.js');
    expect(builtDistAction(['a.js', 'b.js'], { dir, entries: ['a.js'], env: {} })).toEqual({ action: 'skip' });
    for (const CI of ['', 'false', '0']) {
      expect(builtDistAction(['b.js'], { dir, entries: [], env: { CI } })).toEqual({ action: 'skip' });
    }
  });

  it('fails the tests when a file they need is missing and CI is set', () => {
    const dir = folder('a.js');
    for (const CI of ['true', '1', 'yes']) {
      expect(builtDistAction(['b.js'], { dir, entries: ['a.js'], env: { CI } })).toEqual({ action: 'fail', missing: ['b.js'] });
    }
  });

  it('fails the tests when any dist entry is missing and CI is set, even one they do not use', () => {
    const dir = folder('a.js');
    expect(builtDistAction(['a.js'], { dir, entries: ['a.js', 'engine.js', 'engine.d.ts'], env: { CI: 'true' } })).toEqual({
      action: 'fail',
      missing: ['engine.js', 'engine.d.ts'],
    });
  });

  it('knows the entries the package publishes', () => {
    expect(distEntries).toEqual(
      expect.arrayContaining(['index.js', 'index.cjs', 'index.d.ts', 'headless.js', 'engine.js', 'engine.cjs', 'engine.d.ts', 'engine.d.cts']),
    );
  });
});
