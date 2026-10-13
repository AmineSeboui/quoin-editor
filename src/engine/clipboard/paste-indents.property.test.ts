import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbitraryBlocks } from '../blocks/blocks-arbitrary';
import { setSelection } from '../commands/selection-commands';
import type { QuoinBlock } from '../model/quoin-block';
import { buildState, newIds, run } from '../test-support/build-state';
import { orphans } from '../test-support/orphans';
import { selectionChoice, selectionFor } from '../test-support/selection-arbitrary';
import { insertSlice } from './insert-slice';
import type { Slice } from './slice';

const MARKDOWN = ['text', '', '# title', '- item', '1. one', '- [ ] task', '> quote', 'two\n\npieces', '- a\n  - b'];
const content = fc.oneof(
  { weight: 4, arbitrary: fc.constantFrom(...MARKDOWN).map((markdown) => ({ type: 'MARKDOWN', data: { markdown } })) },
  { weight: 1, arbitrary: fc.constant({ type: 'DIVIDER', data: {} }) },
  { weight: 1, arbitrary: fc.constant({ type: 'TOGGLE', data: { markdown: 'summary', open: false } }) },
  { weight: 1, arbitrary: fc.constant({ type: 'IMAGE', data: { storageKey: 'k', alt: '', caption: 'cap' } }) },
);
const sliceBlock = fc
  .tuple(content, fc.nat(4))
  .map(([block, indent]): QuoinBlock => ({ id: 's', ...block, ...(indent > 0 ? { indent } : {}) }));
const slice: fc.Arbitrary<Slice> = fc.record({
  blocks: fc.array(sliceBlock, { minLength: 1, maxLength: 5 }),
  openStart: fc.boolean(),
  openEnd: fc.boolean(),
  plainText: fc.boolean(),
});

describe('pasted indents', () => {
  it('leaves every block at most one level below the block before it, whatever the slice and the selection', () => {
    fc.assert(
      fc.property(arbitraryBlocks(), selectionChoice, slice, (blocks, choice, pasted) => {
        const built = buildState(blocks);
        if (built.doc.blocks.length === 0) return;
        const state = run(built, setSelection(selectionFor(built.doc, choice))).state;
        const done = run(state, insertSlice(pasted, { newId: newIds('p') }));
        expect(orphans(done.state.doc)).toEqual([]);
      }),
      { numRuns: 1000 },
    );
  });
});
