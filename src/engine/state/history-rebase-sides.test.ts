import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import { buildState, markdownOf, run } from '../test-support/build-state';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { joinBlocksStep, splitBlockStep } from '../transform/split-join-steps';
import type { Step } from '../transform/step';
import { applyTransaction, type EditorState } from './editor-state';
import { historyPlugin, undo, undoDepth } from './history';
import { Transaction } from './transaction';

const insert = (block: string, offset: number, value: string) =>
  replaceInlineStep(block, 'text', offset, offset, [text(value)]);
const remove = (block: string, from: number, to: number) => replaceInlineStep(block, 'text', from, to, []);
const paragraph = (id: string) => ({ id, type: 'MARKDOWN', attrs: { kind: 'paragraph' }, indent: 0, region: 'text' });

const start = (blocks: string[]) => buildState(blocks, { block: 0, offset: 0 }, { plugins: [historyPlugin()] });

let clock = 0;
const change = (state: EditorState, recorded: boolean, ...steps: Step[]) => {
  const tr = new Transaction(state, (clock += 1000)).setOrigin(recorded ? 'input' : 'command');
  if (!recorded) tr.setMeta('addToHistory', false);
  return applyTransaction(
    state,
    steps.reduce((next, step) => next.step(step), tr),
  );
};
const undone = (state: EditorState) => run(state, undo).state;
const ids = (state: EditorState) => state.doc.blocks.map(({ id }) => id);

describe('undo through a change made without recording, on either side of a place both touched', () => {
  it('puts text back at the end of the block it splits apart again, not at the start of the next', () => {
    const join = joinBlocksStep('b0', 'text', 'b1', 'text');
    const deleted = change(start(['abcd', 'efgh']), true, remove('b0', 2, 4), remove('b1', 0, 2), join);
    const state = change(deleted, false, insert('b0', 0, 'XY'));
    expect(markdownOf(state)).toEqual(['XYabgh']);
    expect(markdownOf(undone(state))).toEqual(['XYabcd', 'efgh']);
  });

  it('keeps an item that splits a block twice at one place and joins what the second split made', () => {
    const joined = change(
      start(['abcd', 'efgh']),
      true,
      splitBlockStep('b1', 'text', 0, paragraph('n')),
      joinBlocksStep('b0', 'text', 'b1', 'text'),
      joinBlocksStep('b0', 'text', 'n', 'text'),
    );
    const state = change(joined, false, insert('b0', 0, 'XY'));
    expect(undoDepth(state)).toBe(1);
    const back = undone(state);
    expect(markdownOf(back)).toEqual(['XYabcd', 'efgh']);
    expect(ids(back)).toEqual(['b0', 'b1']);
  });

  it('puts two deleted pieces back in their order once the text between them is deleted', () => {
    let state = change(start(['aBcDe']), true, remove('b0', 1, 2));
    state = change(state, true, remove('b0', 2, 3));
    state = change(state, false, remove('b0', 1, 2));
    expect(markdownOf(state)).toEqual(['ae']);
    expect(undoDepth(state)).toBe(2);
    expect(markdownOf(undone(undone(state)))).toEqual(['aBDe']);
  });

  it('puts two pieces one item deleted back in their order once the text between them is deleted', () => {
    let state = change(start(['aBcDe']), true, remove('b0', 1, 2), remove('b0', 2, 3));
    state = change(state, false, remove('b0', 1, 2));
    expect(markdownOf(undone(state))).toEqual(['aBDe']);
  });
});
