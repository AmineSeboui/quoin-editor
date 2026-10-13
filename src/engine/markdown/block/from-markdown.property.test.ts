import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { fromMarkdown } from './from-markdown';

const FRAGMENTS = [
  '# ', '## ', '- ', '* ', '+ ', '1. ', '2) ', '> ', '[ ] ', '[x] ', '```', '~~~', '$$', '---', '***', '___', '===',
  '|', ' | ', ':--', '<details>', '</details>', '<summary>', '</summary>', '<div>', '</div>', '<!-- quoin:toc -->',
  '<!-- ', ' -->', '**', '_', '`', '\\', '[', ']', '(', ')', '!', '<', '>', '&amp;', 'a', 'b', 'text', ' ', '  ',
  '    ', '\t', '[a]: /u', '[!NOTE]', '![i](u)', '"t"', '#', '=', ':', '-',
];
const BREAKS = ['\n', '\n\n', '\r\n', '\r'];

const markdownDocument = fc
  .array(
    fc.oneof(
      { weight: 6, arbitrary: fc.constantFrom(...FRAGMENTS) },
      { weight: 1, arbitrary: fc.constantFrom(...BREAKS) },
    ),
    { maxLength: 60 },
  )
  .map((parts) => parts.join(''));

const softBreaks = fc.constantFrom('newline' as const, 'space' as const);

describe('fromMarkdown properties', () => {
  it('returns well formed blocks with distinct ids for any text', () => {
    fc.assert(
      fc.property(fc.oneof(markdownDocument, fc.string({ unit: 'binary' })), softBreaks, (markdown, softBreak) => {
        let n = 0;
        const blocks = fromMarkdown(markdown, { softBreak, newId: () => `b${++n}` });
        expect(new Set(blocks.map((block) => block.id)).size).toBe(blocks.length);
        for (const block of blocks) {
          expect(typeof block.type).toBe('string');
          expect(typeof block.data).toBe('object');
          if (block.indent !== undefined) expect(Number.isInteger(block.indent) && block.indent > 0).toBe(true);
        }
      }),
      { numRuns: 3000 },
    );
  });

  it('never splits a MARKDOWN block it wrote when that block is read again', () => {
    fc.assert(
      fc.property(markdownDocument, softBreaks, (markdown, softBreak) => {
        for (const block of fromMarkdown(markdown, { softBreak })) {
          if (block.type !== 'MARKDOWN') continue;
          const written = String(block.data.markdown);
          const again = fromMarkdown(written, { softBreak: 'newline' });
          const stable = again.length === 0 || (again.length === 1 && again[0].data.markdown === written);
          expect(stable, JSON.stringify(written)).toBe(true);
        }
      }),
      { numRuns: 5000 },
    );
  });
});
