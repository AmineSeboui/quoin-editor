import { describe, expect, it } from 'vitest';
import type { Pos } from '../model/types';
import { applyTransaction } from '../state/editor-state';
import { Transaction } from '../state/transaction';
import { buildState, markdownOf, newIds } from '../test-support/build-state';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import { deleteRange } from './delete-range';

const at = (block: number, offset: number, region = 'text'): Pos => ({ block: `b${block}`, region, offset });

function remove(blocks: Parameters<typeof buildState>[0], from: Pos, to: Pos) {
  const state = buildState(blocks);
  const tr = new Transaction(state);
  const caret = deleteRange(tr, state.schema, from, to, newIds());
  return { tr, caret, state: applyTransaction(state, tr) };
}

describe('deleteRange', () => {
  it('deletes inside one region with a single step', () => {
    const { tr, caret, state } = remove(['hello'], at(0, 1), at(0, 3));
    expect(tr.steps.map((step) => step.stepType)).toEqual(['replaceInline']);
    expect(markdownOf(state)).toEqual(['hlo']);
    expect(caret).toEqual(at(0, 1));
  });

  it('does nothing for an empty range', () => {
    const { tr, caret } = remove(['hello'], at(0, 2), at(0, 2));
    expect(tr.steps).toEqual([]);
    expect(caret).toEqual(at(0, 2));
  });

  it('removes the blocks between and joins the ends into the first block', () => {
    const { caret, state } = remove(['# head', 'mid', 'tail'], at(0, 2), at(2, 1));
    expect(markdownOf(state)).toEqual(['# heail']);
    expect(caret).toEqual(at(0, 2));
  });

  it('removes a void block at the start and keeps the rest of the last block', () => {
    const { caret, state } = remove(['a', DIVIDER_FIXTURE, 'cd'], at(1, 0, ''), at(2, 1));
    expect(markdownOf(state)).toEqual(['a', 'd']);
    expect(caret).toEqual(at(2, 0));
  });

  it('removes a void block at the end and keeps the start of the first block', () => {
    const { caret, state } = remove(['ab', DIVIDER_FIXTURE, 'c'], at(0, 1), at(1, 0, ''));
    expect(markdownOf(state)).toEqual(['a', 'c']);
    expect(caret).toEqual(at(0, 1));
  });

  it('leaves an empty paragraph where two void ends were removed', () => {
    const { caret, state } = remove([DIVIDER_FIXTURE, 'x', DIVIDER_FIXTURE, 'y'], at(0, 0, ''), at(2, 0, ''));
    expect(markdownOf(state)).toEqual(['', 'y']);
    expect(caret).toEqual({ block: 'n0', region: 'text', offset: 0 });
  });

  it('keeps the document non-empty when everything is removed', () => {
    const { state } = remove([DIVIDER_FIXTURE, DIVIDER_FIXTURE], at(0, 0, ''), at(1, 0, ''));
    expect(markdownOf(state)).toEqual(['']);
  });
});
