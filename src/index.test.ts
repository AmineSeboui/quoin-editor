import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import * as headless from './headless';
import * as main from './index';

const dist = resolve(__dirname, '..', 'dist');

describe('the main entry', () => {
  it('re-exports every headless name, as the documentation promises', () => {
    const missing = Object.keys(headless).filter((name) => !(name in main));
    expect(missing).toEqual([]);
  });

  it('exports the upload controls a custom block needs', () => {
    expect(main.UploadField).toBeTypeOf('function');
    expect(main.FilePickerButton).toBeTypeOf('function');
  });

  it('still exports the editor surface alongside them', () => {
    expect(main.BlockCanvas).toBeTypeOf('function');
    expect(main.coreBlocks.length).toBeGreaterThan(0);
  });
});

const entries = ['index.js', 'headless.js', 'index.cjs', 'headless.cjs'];

function expectSameImplementation(builtMain: Record<string, unknown>, builtHeadless: Record<string, unknown>) {
  const names = Object.keys(builtHeadless);
  expect(names.length).toBeGreaterThan(0);
  for (const name of names) expect(builtMain[name]).toBe(builtHeadless[name]);
}

describe.runIf(entries.every((entry) => existsSync(resolve(dist, entry))))('built entries', () => {
  it('share one implementation between the main and headless ES module builds', async () => {
    const builtMain = await import(resolve(dist, 'index.js'));
    const builtHeadless = await import(resolve(dist, 'headless.js'));
    expectSameImplementation(builtMain, builtHeadless);
  });

  it('share one implementation between the main and headless CommonJS builds', () => {
    const load = createRequire(import.meta.url);
    expectSameImplementation(load(resolve(dist, 'index.cjs')), load(resolve(dist, 'headless.cjs')));
  });
});
