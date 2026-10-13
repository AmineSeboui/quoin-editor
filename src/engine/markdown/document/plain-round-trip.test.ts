import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { arbitraryBlocks } from '../../blocks/blocks-arbitrary';
import type { QuoinBlock } from '../../model/quoin-block';
import { readBack, withoutIds } from './export-fixtures';
import { toMarkdown } from './to-markdown';

const ALERT_TONES = ['info', 'tip', 'success', 'warning', 'danger'];
const heading: Pick<QuoinBlock, 'type' | 'data'> = { type: 'MARKDOWN', data: { markdown: '# x' } };
const BARE_ITEM = /^(- |\d+\. )$/;
const PARAGRAPH = /^(?![#>-]|\d+\.)/;

// Plain markdown cannot hold an empty paragraph or quote, a custom block, a callout tone or icon that has no alert,
// a table without a header row, or a line of only whitespace inside code.
function holdable(block: QuoinBlock): QuoinBlock {
  const { type, data } = block;
  if (type === 'PLUGIN') return { ...block, ...heading };
  if (type === 'MARKDOWN' && (data.markdown === '' || data.markdown === '> ')) return { ...block, ...heading };
  if (type === 'CALLOUT') {
    return ALERT_TONES.includes(String(data.tone)) ? { ...block, data: { tone: data.tone, body: data.body } } : { ...block, ...heading };
  }
  if (type === 'TABLE') return { ...block, data: { ...data, header: true } };
  if (type === 'CODE') {
    const code = String(data.code).replace(/^[ \t]+$/gm, '');
    return { ...block, data: { ...data, code } };
  }
  return block;
}

// Markdown reads a paragraph under an empty item as the text of the item.
const hidesInEmptyItem = (blocks: QuoinBlock[]) =>
  blocks.some((block, at) => {
    const parent = blocks[at - 1];
    const bare = parent?.type === 'MARKDOWN' && BARE_ITEM.test(String(parent.data.markdown));
    const paragraph = block.type === 'MARKDOWN' && PARAGRAPH.test(String(block.data.markdown));
    return bare && paragraph && (block.indent ?? 0) > (parent.indent ?? 0);
  });

describe('plain document round trip', () => {
  it('reads back every block that markdown can hold', () => {
    fc.assert(
      fc.property(arbitraryBlocks(), (generated) => {
        const blocks = generated.map(holdable);
        fc.pre(!hidesInEmptyItem(blocks));
        const markdown = toMarkdown(blocks);
        expect(readBack(markdown), markdown).toEqual(withoutIds(blocks));
      }),
      { numRuns: 500 },
    );
  });
});
