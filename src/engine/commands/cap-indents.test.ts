import { describe, expect, it } from 'vitest';
import { applyTransaction } from '../state/editor-state';
import { Transaction } from '../state/transaction';
import { buildState } from '../test-support/build-state';
import { capIndents } from './cap-indents';

const indentsAfterCap = (indents: number[], from: number) => {
  const state = buildState(indents.map((indent, i) => ({ id: 'x', type: 'MARKDOWN', data: { markdown: `p${i}` }, indent })));
  const tr = new Transaction(state);
  capIndents(tr, from);
  return applyTransaction(state, tr).doc.blocks.map((block) => block.indent);
};

describe('capIndents', () => {
  it('lifts each block to at most one below the block before it, children along', () => {
    expect(indentsAfterCap([0, 2, 3], 1)).toEqual([0, 1, 2]);
  });

  it('keeps siblings level with each other and stops at the first block that fits', () => {
    expect(indentsAfterCap([0, 2, 3, 2, 1, 2], 1)).toEqual([0, 1, 2, 1, 1, 2]);
  });

  it('lifts a shallower block no deeper than the lifted blocks before it', () => {
    expect(indentsAfterCap([0, 3, 2], 1)).toEqual([0, 1, 1]);
  });

  it('brings the first block of the document to zero', () => {
    expect(indentsAfterCap([2, 1, 0], 0)).toEqual([0, 0, 0]);
  });

  it('changes nothing when the block at the edit point already fits', () => {
    expect(indentsAfterCap([0, 1, 5], 1)).toEqual([0, 1, 5]);
    expect(indentsAfterCap([0, 1], 2)).toEqual([0, 1]);
  });
});
