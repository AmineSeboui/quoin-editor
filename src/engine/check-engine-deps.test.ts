import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const script = resolve(__dirname, '..', '..', 'scripts', 'check-engine-deps.mjs');
let created: string[] = [];

function check(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'quoin-engine-'));
  created.push(dir);
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  const run = spawnSync(process.execPath, [script, dir], { encoding: 'utf8' });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created = [];
});

describe('the engine import check', () => {
  it('accepts files that import each other', () => {
    const run = check({ 'a.ts': "import { b } from './sub/b';\nexport const a = b;", 'sub/b.ts': 'export const b = 1;' });
    expect(run.status).toBe(0);
  });

  it('rejects a package import and an import from outside the engine', () => {
    expect(check({ 'a.ts': "import x from 'left-pad';\nexport default x;" })).toMatchObject({ status: 1 });
    expect(check({ 'a.ts': "export * from '../outside';" })).toMatchObject({ status: 1 });
  });

  it('rejects a non test file that imports an arbitrary helper', () => {
    const run = check({
      'blocks/blocks-arbitrary.ts': "import fc from 'fast-check';\nexport const arbitrary = fc.string();",
      'blocks/codec.ts': "import { arbitrary } from './blocks-arbitrary';\nexport const codec = arbitrary;",
    });
    expect(run.status).toBe(1);
    expect(run.output).toContain('codec.ts: ./blocks-arbitrary');
  });

  it('rejects an arbitrary helper imported with its extension, dynamically, or from another folder', () => {
    const helper = { 'x/model-arbitrary.ts': 'export const model = 1;' };
    expect(check({ ...helper, 'a.ts': "import { model } from './x/model-arbitrary.ts';\nexport { model };" }).status).toBe(1);
    expect(check({ ...helper, 'a.ts': "export const load = () => import('./x/model-arbitrary');" }).status).toBe(1);
    expect(check({ ...helper, 'y/a.ts': "export { model } from '../x/model-arbitrary';" }).status).toBe(1);
  });

  it('rejects a non test file that imports from test-support', () => {
    const run = check({
      'test-support/state.ts': 'export const state = 1;',
      'commands/run.ts': "import { state } from '../test-support/state';\nexport const run = state;",
    });
    expect(run.status).toBe(1);
  });

  it('lets tests and the helpers themselves import helpers and test packages', () => {
    const run = check({
      'blocks/blocks-arbitrary.ts': "import fc from 'fast-check';\nexport const arbitrary = fc.string();",
      'blocks/more-arbitrary.ts': "import { arbitrary } from './blocks-arbitrary';\nexport const more = arbitrary;",
      'blocks/codec.property.test.ts': "import { more } from './more-arbitrary';\nimport { it } from 'vitest';\nit('x', () => more);",
      'test-support/state.ts': "import { arbitrary } from '../blocks/blocks-arbitrary';\nexport const state = arbitrary;",
      'blocks/codec.ts': 'export const codec = 1;',
    });
    expect(run.status).toBe(0);
  });
});
