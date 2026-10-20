import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describeBuilt, dist } from '../test/support/built-dist';
import * as headless from './headless';
import * as main from './index';

describe('the main entry', () => {
  it('re-exports every headless name, as the documentation promises', () => {
    const missing = Object.keys(headless).filter((name) => !(name in main));
    expect(missing).toEqual([]);
  });

  it('exports the upload controls a custom block needs', () => {
    expect(main.UploadField).toBeTypeOf('function');
    expect(main.FilePickerButton).toBeTypeOf('function');
  });

  it('exports the English labels and the means to override and read them', () => {
    expect(main.englishLabels.bold).toBe('Bold');
    expect(main.resolveLabels({ bold: 'Gras' }).bold).toBe('Gras');
    expect(main.useLabels).toBeTypeOf('function');
  });

  it('keeps formatShortcut, the utility that writes a shortcut the way the platform does', () => {
    expect(main.formatShortcut('mod+b', { isMac: false })).toBe('Ctrl+B');
  });

  it('still exports the editor surface alongside them', () => {
    expect(main.BlockCanvas).toBeDefined();
    expect(main.coreBlocks.length).toBeGreaterThan(0);
  });

  it('no longer exports the textarea editor or its helpers', () => {
    const removed = [
      'useBlockList',
      'useAutoGrow',
      'TEXT_COMMANDS',
      'applyEdit',
      'lineAt',
      'toggleLinePrefix',
      'continueList',
      'indentList',
      'wrapSelection',
      'linkPaste',
      'insertCommand',
      'shouldOpenPalette',
      'caretRect',
      'useMarkdownKeymap',
    ];
    expect(removed.filter((name) => name in main)).toEqual([]);
  });
});

const entries = ['index.js', 'headless.js', 'index.cjs', 'headless.cjs'];

function expectSameImplementation(builtMain: Record<string, unknown>, builtHeadless: Record<string, unknown>) {
  const names = Object.keys(builtHeadless);
  expect(names.length).toBeGreaterThan(0);
  for (const name of names) expect(builtMain[name]).toBe(builtHeadless[name]);
}

describeBuilt('built entries', entries, () => {
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
