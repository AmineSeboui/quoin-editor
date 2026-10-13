import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fromMarkdown } from '../markdown/block/from-markdown';
import { createSchema } from '../schema/create-schema';
import { createBlockCodec } from './codec';

const FRAGMENTS = [
  '# ', '## ', '- ', '* ', '+ ', '1. ', '2) ', '> ', '[ ] ', '[x] ', '```', '~~~', '$$', '---', '***', '___', '===',
  '|', ' | ', ':--', '<details>', '</details>', '<summary>', '</summary>', '<div>', '</div>', '<!-- quoin:toc -->',
  '<!-- ', ' -->', '**', '_', '`', '\\', '[', ']', '(', ')', '!', '<', '>', '&amp;', 'a', 'b', 'text', ' ', '  ',
  '    ', '\t', '[a]: /u', '[!NOTE]', '![i](u)', '"t"', '#', '=', ':', '-', '<u>', '</u>', '<br>', '$x$',
  '[@A](mention:1)', '<span data-comment="c">', '</span>', '\\|', '`a\\|b`', '<mark data-color="red">', '</mark>',
  '~~', '&#32;', '1.', '\r\n',
];
const BREAKS = ['\n', '\n\n'];
const document = fc
  .array(fc.oneof({ weight: 6, arbitrary: fc.constantFrom(...FRAGMENTS) }, { weight: 2, arbitrary: fc.constantFrom(...BREAKS) }), {
    maxLength: 50,
  })
  .map((parts) => parts.join(''));

describe('blocks that fromMarkdown produces', () => {
  it('are what the engine writes back for them, so loading and editing a sibling never changes them', () => {
    fc.assert(
      fc.property(document, (markdown) => {
        const codec = createBlockCodec(createSchema());
        for (const block of fromMarkdown(markdown, { softBreak: 'newline' })) {
          const engine = codec.toEngineBlocks(block);
          expect(engine, markdown).toHaveLength(1);
          const { id: _id, ...again } = codec.toQuoin({ ...engine[0] });
          const { id: _original, ...expected } = block;
          expect(again, markdown).toEqual(expected);
        }
      }),
      { numRuns: 3000 },
    );
  });
});
