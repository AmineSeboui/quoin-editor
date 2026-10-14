import { describe, expect, it } from 'vitest';
import { buildState } from '../../engine/test-support/build-state';
import { blockStatus } from './block-status';

const nested = [
  { id: 'x', type: 'TOGGLE', data: { markdown: 'closed', open: false } },
  { id: 'x', type: 'MARKDOWN', data: { markdown: 'child' }, indent: 1 },
  { id: 'x', type: 'MARKDOWN', data: { markdown: 'grandchild' }, indent: 2 },
  'after',
  { id: 'x', type: 'TOGGLE', data: { markdown: 'open', open: true } },
  { id: 'x', type: 'MARKDOWN', data: { markdown: 'shown' }, indent: 1 },
];

describe('blockStatus', () => {
  it('marks the blocks a node or block range selection covers, whichever way it was dragged', () => {
    const doc = ['a', { id: 'x', type: 'DIVIDER', data: {} }, 'c', 'd'];
    const covered = (selection: Parameters<typeof buildState>[1]) =>
      ['b0', 'b1', 'b2', 'b3'].map((id) => blockStatus(buildState(doc, selection), id));
    expect(covered({ node: 1 })).toEqual(['plain', 'selected', 'plain', 'plain']);
    expect(covered({ blocks: [1, 3] })).toEqual(['plain', 'selected', 'selected', 'selected']);
    expect(covered({ blocks: [2, 0] })).toEqual(['selected', 'selected', 'selected', 'plain']);
  });

  it('leaves blocks plain under a text selection, whether in one block or across several', () => {
    const state = buildState(['a', 'b'], { anchor: { block: 0, offset: 0 }, head: { block: 1, offset: 1 } });
    expect([blockStatus(state, 'b0'), blockStatus(state, 'b1')]).toEqual(['plain', 'plain']);
    expect(blockStatus(buildState(['a'], null), 'b0')).toBe('plain');
  });

  it('marks a block without text inside a selection across blocks, which no highlight reaches', () => {
    const doc = ['a', { id: 'x', type: 'DIVIDER', data: {} }, 'c', { id: 'x', type: 'DIVIDER', data: {} }];
    const state = buildState(doc, { anchor: { block: 2, offset: 1 }, head: { block: 0, offset: 0 } });
    expect(['b0', 'b1', 'b2', 'b3'].map((id) => blockStatus(state, id))).toEqual(['plain', 'selected', 'plain', 'plain']);
  });

  it('hides every block under a closed toggle and none under an open one', () => {
    const state = buildState(nested, null);
    expect(state.doc.blocks.map((block) => blockStatus(state, block.id))).toEqual([
      'plain',
      'hidden',
      'hidden',
      'plain',
      'plain',
      'plain',
    ]);
  });

  it('lets a hidden block stay hidden when a selection covers it', () => {
    const state = buildState(nested, { blocks: [0, 3] });
    expect(blockStatus(state, 'b1')).toBe('hidden');
    expect(blockStatus(state, 'b0')).toBe('selected');
  });

  it('treats an id the document does not hold as plain', () => {
    expect(blockStatus(buildState([{ id: 'x', type: 'DIVIDER', data: {} }], { node: 0 }), 'gone')).toBe('plain');
  });
});
