import { describe, expect, it } from 'vitest';
import { deleteBlocks } from '../commands/block-structure';
import { createDoc } from '../model/doc';
import { text } from '../model/inline';
import type { EngineBlock } from '../model/types';
import { createSchema } from '../schema/create-schema';
import { buildState, caretOf, run } from '../test-support/build-state';
import { blockEnd, blockStart } from '../transform/block-edges';
import { removeBlocksStep } from '../transform/block-steps';
import { endOf, primaryRegion, startOf, textSelection } from './selection';

const table = { id: 't', type: 'TABLE', data: { rows: [['a', 'b'], ['c', 'last']] } };
const image = { id: 'i', type: 'IMAGE', data: { storageKey: 'k', alt: '', caption: 'cap' } };

const wide: EngineBlock = {
  id: 'w',
  type: 'TABLE',
  indent: 0,
  attrs: { rows: 1, cols: 11, header: false },
  regions: { 'cell:0:10': [text('end')], 'cell:0:2': [], 'cell:0:0': [text('a')] },
};

describe('the edges of a structured block follow its region order', () => {
  it('starts in the first cell and ends in the last one, whatever the key order', () => {
    const doc = createDoc([wide]);
    const schema = createSchema();
    expect(startOf(doc, schema, 'w')).toEqual(textSelection({ block: 'w', region: 'cell:0:0', offset: 0 }));
    expect(endOf(doc, schema, 'w')).toEqual(textSelection({ block: 'w', region: 'cell:0:10', offset: 3 }));
    expect(blockStart(wide)).toEqual({ block: 'w', region: 'cell:0:0', offset: 0 });
    expect(blockEnd(wide)).toEqual({ block: 'w', region: 'cell:0:10', offset: 3 });
    expect(primaryRegion(schema, wide)).toBe('cell:0:0');
  });

  it('lands at the end of the last cell after deleting the paragraph that follows a table', () => {
    const { state } = run(buildState([table, 'para'], { blocks: [1, 1] }), deleteBlocks);
    expect(caretOf(state)).toEqual({ block: 0, region: 'cell:1:1', offset: 4 });
  });

  it('maps a position in a removed block to the end of the table before it', () => {
    const state = buildState([table, 'para']);
    const { map } = removeBlocksStep(1, 1).apply(state.doc);
    expect(map({ block: 'b1', region: 'text', offset: 2 }, -1)).toEqual({ block: 'b0', region: 'cell:1:1', offset: 4 });
  });

  it('lands at the start of the caption after removing the block above an image', () => {
    const { state } = run(buildState(['para', image], { blocks: [0, 0] }), deleteBlocks);
    expect(caretOf(state)).toEqual({ block: 0, offset: 0 });
    expect(state.selection).toEqual(textSelection({ block: 'b1', region: 'caption', offset: 0 }));
  });
});
