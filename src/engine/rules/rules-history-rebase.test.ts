import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import { applyTransaction, type EditorState } from '../state/editor-state';
import { historyPlugin, undo, undoDepth } from '../state/history';
import { Transaction } from '../state/transaction';
import { buildState, markdownOf, newIds, run } from '../test-support/build-state';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { blockInputRules } from './block-rules';
import { insertTextWithRules } from './input-rule';
import { typographyRules } from './typography';

const unrecorded = (state: EditorState, index: number, offset: number) =>
  applyTransaction(
    state,
    new Transaction(state, 1e9)
      .setOrigin('command')
      .setMeta('addToHistory', false)
      .step(replaceInlineStep(state.doc.blocks[index].id, 'text', offset, offset, [text('XY')])),
  );

function converted(indent: number) {
  const entry = { id: 'x', type: 'MARKDOWN', data: { markdown: '- \\#tail' }, indent };
  const other = { id: 'y', type: 'MARKDOWN', data: { markdown: 'other' }, indent: 0 };
  const state = buildState([entry, other], { block: 0, offset: 1 }, { plugins: [historyPlugin()] });
  return run(state, insertTextWithRules(' ', blockInputRules, { newId: newIds() })).state;
}

describe('an undo item carried over a change made without recording', () => {
  describe.each([0, 2])('a list item turned into a heading at indent %i', (indent) => {
    const pad = ' '.repeat(indent * 2);
    it.each([
      ['another block', 1, 0, [`${pad}- \\#tail`, 'XYother']],
      ['the start of its block', 0, 0, [`${pad}- XY#tail`, 'other']],
      ['the end of its block', 0, 4, [`${pad}- \\#tailXY`, 'other']],
    ])('is kept after an insert in %s, and undo restores the kind and the prefix', (_, index, offset, expected) => {
      const state = unrecorded(converted(indent), index, offset);
      expect(undoDepth(state)).toBe(1);
      expect(markdownOf(run(state, undo).state)).toEqual(expected);
    });
  });

  it('keeps a typing group that ran a smart quote after an insert earlier in its block', () => {
    let state = buildState(['start', 'other'], { block: 0, offset: 5 }, { plugins: [historyPlugin()] });
    for (const character of ' say "hi"') state = run(state, insertTextWithRules(character, typographyRules())).state;
    expect(markdownOf(state)[0]).toBe('start say \u201chi\u201d');
    const changed = unrecorded(state, 0, 0);
    expect(undoDepth(changed)).toBe(undoDepth(state));
    expect(markdownOf(run(changed, undo).state)).toEqual(['XYstart', 'other']);
  });
});
