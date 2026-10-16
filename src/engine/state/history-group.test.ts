import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { buildState, markdownOf, run } from '../test-support/build-state';
import { applyTransaction, type EditorState } from './editor-state';
import { closeHistory, HISTORY_GROUP, historyPlugin, undo, undoDepth } from './history';
import { Transaction } from './transaction';

const start = () => buildState(['', ''], { node: 0 }, { plugins: [historyPlugin()] });

function write(state: EditorState, block: 'b0' | 'b1', value: string, time: number, group?: string, close = false) {
  const tr = new Transaction(state, time).step(replaceInlineStep(block, 'text', 0, 0, [text(value)]));
  if (group !== undefined) tr.setMeta(HISTORY_GROUP, group);
  return applyTransaction(state, close ? closeHistory(tr) : tr);
}

describe('history groups named by a transaction', () => {
  it('merge writes of one group inside the group delay into one undo step', () => {
    let state = write(start(), 'b0', 'a', 0, 'editor:b0');
    state = write(state, 'b0', 'b', 300, 'editor:b0');
    state = write(state, 'b0', 'c', 600, 'editor:b0');
    expect(undoDepth(state)).toBe(1);
    expect(markdownOf(run(state, undo).state)).toEqual(['', '']);
  });

  it('keep writes of one group apart once the delay has passed', () => {
    let state = write(start(), 'b0', 'a', 0, 'editor:b0');
    state = write(state, 'b0', 'b', 1000, 'editor:b0');
    expect(undoDepth(state)).toBe(2);
    expect(markdownOf(run(state, undo).state)).toEqual(['a', '']);
  });

  it('keep writes of different groups apart', () => {
    let state = write(start(), 'b0', 'a', 0, 'editor:b0');
    state = write(state, 'b1', 'b', 10, 'editor:b1');
    expect(undoDepth(state)).toBe(2);
  });

  it('are split by closeHistory, which wins over the group', () => {
    let state = write(start(), 'b0', 'a', 0, 'editor:b0');
    state = write(state, 'b0', 'b', 10, 'editor:b0', true);
    state = write(state, 'b0', 'c', 20, 'editor:b0');
    expect(undoDepth(state)).toBe(3);
  });

  it('leave commands without a group in steps of their own, as before', () => {
    let state = write(start(), 'b0', 'a', 0);
    state = write(state, 'b0', 'b', 10);
    expect(undoDepth(state)).toBe(2);
  });
});
