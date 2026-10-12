import { existsSync } from 'node:fs';
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

describe.runIf(existsSync(resolve(dist, 'index.js')))('built entries', () => {
  it('share one implementation between the main and headless entries', async () => {
    const builtMain = await import(resolve(dist, 'index.js'));
    const builtHeadless = await import(resolve(dist, 'headless.js'));
    for (const name of Object.keys(builtHeadless)) expect(builtMain[name]).toBe(builtHeadless[name]);
  });
});
