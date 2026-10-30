import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { buildState, markdownOf, run } from '../test-support/build-state';
import { applyTransaction, type EditorState } from './editor-state';
import { historyPlugin, undo, undoDepth } from './history';
import { textSelection } from './selection';
import { Transaction } from './transaction';

const start = () => buildState(['hello world'], { block: 0, offset: 0 }, { plugins: [historyPlugin()] });

const type = (state: EditorState, offset: number, value: string, time: number) =>
  applyTransaction(
    state,
    new Transaction(state, time)
      .setOrigin('input')
      .step(replaceInlineStep('b0', 'text', offset, offset, [text(value)])),
  );

const caretTo = (state: EditorState, offset: number, time: number) =>
  applyTransaction(
    state,
    new Transaction(state, time).setSelection(textSelection({ block: 'b0', region: 'text', offset })),
  );

describe('history grouping across a caret jump', () => {
  it('keeps typing in two places of one region in two steps', () => {
    let state = type(start(), 0, 'X', 0);
    state = caretTo(state, 12, 100);
    state = type(state, 12, 'Y', 200);
    expect(undoDepth(state)).toBe(2);
    state = run(state, undo).state;
    expect(markdownOf(state)).toEqual(['Xhello world']);
    expect(markdownOf(run(state, undo).state)).toEqual(['hello world']);
  });

  it('splits two edits apart even when no selection transaction separates them', () => {
    const state = type(type(start(), 0, 'X', 0), 12, 'Y', 100);
    expect(undoDepth(state)).toBe(2);
  });

  it('still merges two adjacent characters typed within the delay', () => {
    expect(undoDepth(type(type(start(), 0, 'X', 0), 1, 'Y', 100))).toBe(1);
  });

  it('keeps typing right after a shortcut that rewrote text before the caret in one step', () => {
    const rule = (state: EditorState) =>
      applyTransaction(
        state,
        new Transaction(state, 0)
          .setOrigin('input')
          .step(replaceInlineStep('b0', 'text', 0, 0, [text('ab')]))
          .step(replaceInlineStep('b0', 'text', 0, 1, []))
          .setSelection(textSelection({ block: 'b0', region: 'text', offset: 1 })),
      );
    expect(undoDepth(type(rule(start()), 1, 'z', 100))).toBe(1);
  });

  it('still merges a caret move that lands where the last edit ended', () => {
    const state = type(start(), 0, 'X', 0);
    expect(undoDepth(type(caretTo(state, 1, 50), 1, 'Y', 100))).toBe(1);
  });
});
