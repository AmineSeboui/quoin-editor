import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { arbitraryBlocks } from '../../blocks/blocks-arbitrary';
import { fromMarkdown } from '../block/from-markdown';
import { toMarkdown } from './to-markdown';

const strip = (blocks: { id: string }[]) => blocks.map(({ id: _id, ...rest }) => rest);

describe('document round trip', () => {
  it('fromMarkdown(toMarkdown(blocks, lossless)) keeps every block but ids', () => {
    fc.assert(
      fc.property(arbitraryBlocks(), (blocks) => {
        const markdown = toMarkdown(blocks, { lossless: true });
        expect(strip(fromMarkdown(markdown, { softBreak: 'newline' })), markdown).toEqual(strip(blocks));
      }),
      { numRuns: 500 },
    );
  });

  it.each(['`</summary>`', 'a \\</summary> b'])('keeps %j in a toggle summary', (summary) => {
    const blocks = [{ id: 'a', type: 'TOGGLE', data: { markdown: summary, open: false } }];
    for (const lossless of [false, true]) {
      const markdown = toMarkdown(blocks, { lossless });
      expect(strip(fromMarkdown(markdown, { softBreak: 'newline' })), markdown).toEqual(strip(blocks));
    }
  });
});
