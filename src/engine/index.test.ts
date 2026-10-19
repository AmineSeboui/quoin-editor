import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeBuilt, dist } from '../../test/support/built-dist';
import * as engine from './index';

describe('engine entry', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('exports the documented runtime surface', () => {
    expect(Object.keys(engine).sort()).toMatchInlineSnapshot(`
      [
        "PALETTE",
        "Transaction",
        "addMarkStep",
        "applyTransaction",
        "atom",
        "blockInputRules",
        "blockRangeSelection",
        "coreBlockSpecs",
        "coreExtensions",
        "countDoc",
        "countText",
        "createBlockCodec",
        "createEditor",
        "createPluginKey",
        "createSchema",
        "createState",
        "defineExtension",
        "diffBlocks",
        "diffInline",
        "fromHTML",
        "fromMarkdown",
        "getPluginState",
        "insertBlockAfter",
        "insertBlocksStep",
        "insertText",
        "insertTextWithRules",
        "joinBlocksStep",
        "keyName",
        "markInputRules",
        "moveBlocksStep",
        "nodeSelection",
        "normalizeInline",
        "normalizeKey",
        "parseInline",
        "redo",
        "removeBlocksStep",
        "removeMarkStep",
        "replaceBlockStep",
        "replaceDocStep",
        "replaceInlineStep",
        "sanitizeHref",
        "serializeInline",
        "setAttrsStep",
        "setBlockType",
        "setIndentStep",
        "splitBlockStep",
        "stepFromJSON",
        "text",
        "textSelection",
        "toHTML",
        "toMarkdown",
        "toPlainText",
        "toggleMark",
        "typographyRules",
        "undo",
      ]
    `);
  });

  it('works end to end without a DOM', () => {
    for (const name of ['window', 'document', 'navigator']) vi.stubGlobal(name, undefined);
    const editor = engine.createEditor({ blocks: engine.fromMarkdown('# Hi\n\n- a\n- b') });
    expect(engine.toMarkdown(editor.getBlocks())).toBe('# Hi\n\n- a\n- b\n');
  });
});

const NO_DOM = "if (typeof window !== 'undefined' || typeof document !== 'undefined') throw new Error('this process has a DOM');";
const ROUND_TRIP = `
  const blocks = engine.fromMarkdown(process.env.QUOIN_MARKDOWN);
  const editor = engine.createEditor({ blocks, isMac: false });
  process.stdout.write(JSON.stringify({
    types: blocks.map((block) => block.type),
    markdown: engine.toMarkdown(blocks),
    stats: editor.stats(),
  }));`;
const DOCUMENT = '# Title\n\n| name | qty |\n| --- | --: |\n| apple | 3 |\n| _pear_ | 12 |\n\nafter the table\n';

function runInPlainNode(script: string, args: string[], file: string) {
  const output = execFileSync(process.execPath, [...args, script], {
    encoding: 'utf8',
    env: { ...process.env, QUOIN_MARKDOWN: DOCUMENT, QUOIN_ENTRY: file },
  });
  return JSON.parse(output);
}

describeBuilt('the built engine entry', ['engine.js', 'engine.cjs'], () => {
  const expected = { types: ['MARKDOWN', 'TABLE', 'MARKDOWN'], markdown: DOCUMENT, stats: { characters: 44, words: 10 } };

  it('loads as an ES module in Node without a DOM and round trips a table', () => {
    const entry = pathToFileURL(resolve(dist, 'engine.js')).href;
    const script = `${NO_DOM}\nconst engine = await import(process.env.QUOIN_ENTRY);${ROUND_TRIP}`;
    expect(runInPlainNode(script, ['--input-type=module', '-e'], entry)).toEqual(expected);
  });

  it('loads as CommonJS in Node without a DOM and round trips a table', () => {
    const script = `${NO_DOM}\nconst engine = require(process.env.QUOIN_ENTRY);${ROUND_TRIP}`;
    expect(runInPlainNode(script, ['-e'], resolve(dist, 'engine.cjs'))).toEqual(expected);
  });
});
