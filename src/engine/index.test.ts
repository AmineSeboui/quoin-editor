import { afterEach, describe, expect, it, vi } from 'vitest';
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
