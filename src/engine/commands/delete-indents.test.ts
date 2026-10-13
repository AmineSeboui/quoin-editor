import { describe, expect, it } from 'vitest';
import { applyTransaction } from '../state/editor-state';
import { Transaction } from '../state/transaction';
import { buildState, caretOf, markdownOf, newIds, run } from '../test-support/build-state';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import { deleteBlocks } from './block-structure';
import { deleteBackward, deleteForward, deleteSelection } from './delete-commands';
import { insertText } from './insert-text';
import { removeBlocks } from './remove-blocks';

const line = (markdown: string, indent = 0) => ({ id: 'x', type: 'MARKDOWN', data: { markdown }, indent });
const nested = () => [line('A'), line('B', 1), line('C', 2)];

describe('deleting keeps every block at most one level below the block before it', () => {
  it('lifts the children of a block that Delete joins into the block before', () => {
    const { state } = run(buildState(nested(), { block: 0, offset: 1 }), deleteForward);
    expect(markdownOf(state)).toEqual(['AB', '  C']);
  });

  it('lifts the children of an empty paragraph that Delete removes before a void block', () => {
    const blocks = [line('A'), line('', 1), { ...DIVIDER_FIXTURE, indent: 2 }];
    const { state } = run(buildState(blocks, { block: 1, offset: 0 }), deleteForward);
    expect(markdownOf(state)).toEqual(['A', '  <DIVIDER>']);
    expect(caretOf(state)).toEqual({ node: 1 });
  });

  it('lifts what followed a range deleted across blocks', () => {
    const blocks = [line('Aaa'), line('B', 1), line('Cc', 2), line('D', 3)];
    const selection = { anchor: { block: 0, offset: 1 }, head: { block: 2, offset: 1 } };
    expect(markdownOf(run(buildState(blocks, selection), deleteBackward).state)).toEqual(['Ac', '  D']);
  });

  it('removes a block-selected block with its children, exactly as deleteBlocks does', () => {
    const state = buildState(nested(), { blocks: [1, 1] });
    expect(markdownOf(run(state, deleteBackward).state)).toEqual(['A']);
    expect(run(state, deleteSelection).state.doc).toEqual(run(state, deleteBlocks).state.doc);
  });

  it('removes a node-selected block with its children', () => {
    const blocks = [line('A'), DIVIDER_FIXTURE, line('child', 1), line('after')];
    const { state } = run(buildState(blocks, { node: 1 }), deleteBackward);
    expect(markdownOf(state)).toEqual(['A', 'after']);
    expect(caretOf(state)).toEqual({ block: 0, offset: 1 });
  });

  it('replaces a block-selected block and its children when typing over it', () => {
    const { state } = run(buildState(nested(), { blocks: [1, 1] }), insertText('z', { newId: newIds() }));
    expect(markdownOf(state)).toEqual(['A', '  z']);
  });

  it('lifts the children of a block removed on its own', () => {
    const state = buildState(nested());
    const tr = new Transaction(state);
    removeBlocks(tr, state.schema, 1, 1);
    expect(markdownOf(applyTransaction(state, tr))).toEqual(['A', '  C']);
  });
});
