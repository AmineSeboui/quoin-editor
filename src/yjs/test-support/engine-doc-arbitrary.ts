import fc from 'fast-check';
import { arbitraryRichInline } from '../../engine/markdown/inline/inline-arbitrary';
import { createDoc } from '../../engine/model/doc';
import type { EngineBlock, EngineDoc } from '../../engine/model/types';

// Yjs stores plain objects only, as JSON gives them.
const DICTIONARY = { noNullPrototype: true } as const;
const scalar = fc.oneof(fc.constantFrom('a', '', 'x"y', '\u00E9'), fc.integer({ min: -3, max: 3 }), fc.boolean());
const value = fc.oneof(
  { weight: 3, arbitrary: scalar },
  { weight: 1, arbitrary: fc.array(scalar, { maxLength: 2 }) },
  { weight: 1, arbitrary: fc.dictionary(fc.constantFrom('k', 'v'), scalar, { ...DICTIONARY, maxKeys: 2 }) },
  { weight: 1, arbitrary: fc.constant(null) },
);

const block = fc.record({
  type: fc.constantFrom('MARKDOWN', 'CALLOUT', 'DIVIDER', 'X_FROM_A_PLUGIN'),
  indent: fc.integer({ min: 0, max: 3 }),
  attrs: fc.dictionary(fc.constantFrom('kind', 'level', 'tone', 'data', 'extra'), value, { ...DICTIONARY, maxKeys: 3 }),
  regions: fc.dictionary(fc.constantFrom('text', 'body', 'note'), arbitraryRichInline(), { ...DICTIONARY, maxKeys: 2 }),
});

/** Documents of known and unknown block types, with marks and atoms the core schema does not know. */
export const arbitraryEngineDoc: fc.Arbitrary<EngineDoc> = fc
  .array(block, { maxLength: 5 })
  .map((blocks) => createDoc(blocks.map((content, at): EngineBlock => ({ id: `b${at}`, ...content }))));
