import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { arbitraryInline } from '../markdown/inline/inline-arbitrary';
import { PALETTE } from '../markdown/palette';
import { equalInline, normalizeInline, text } from '../model/inline';
import type { EngineBlock, Inline } from '../model/types';
import { createSchema } from '../schema/create-schema';
import { createBlockCodec } from './codec';

const codec = createBlockCodec(createSchema(), { newId: () => 'new' });

const lineAttrs = fc.oneof(
  fc.constant({ kind: 'paragraph' }),
  fc.integer({ min: 1, max: 6 }).map((level) => ({ kind: 'heading', level })),
  fc.constant({ kind: 'bullet' }),
  fc.integer({ min: 0, max: 999 }).map((start) => ({ kind: 'ordered', start })),
  fc.boolean().map((checked) => ({ kind: 'task', checked })),
  fc.constant({ kind: 'quote' }),
);
const style = fc.record(
  {
    align: fc.constantFrom('left', 'center', 'right', 'justify'),
    color: fc.constantFrom(...PALETTE),
    background: fc.constantFrom(...PALETTE),
  },
  { requiredKeys: [] },
);

function assertRoundTrip(attrs: EngineBlock['attrs'], inline: Inline) {
  const block: EngineBlock = { id: 'b', type: 'MARKDOWN', indent: 0, attrs, regions: { text: inline } };
  const { data } = codec.toQuoin(block);
  const [back] = codec.toEngineBlocks({ id: 'b', type: 'MARKDOWN', data });
  expect(back.attrs, String(data.markdown)).toEqual(attrs);
  expect(equalInline(back.regions.text, inline), String(data.markdown)).toBe(true);
}

describe('MARKDOWN block round trip', () => {
  it('reads back the attrs and the text region it wrote', () => {
    fc.assert(
      fc.property(lineAttrs, style, arbitraryInline(), (line, styling, inline) => {
        assertRoundTrip({ ...line, ...styling }, inline);
      }),
      { numRuns: 3000 },
    );
  });

  it('keeps a heading text that ends in a hash run', () => {
    const hashes = fc.integer({ min: 1, max: 4 }).map((n) => ` ${'#'.repeat(n)}`);
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), arbitraryInline(), hashes, (level, inline, tail) => {
        assertRoundTrip({ kind: 'heading', level }, normalizeInline([...inline, text(tail)]));
      }),
      { numRuns: 1000 },
    );
  });
});
