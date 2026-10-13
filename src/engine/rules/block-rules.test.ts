import { describe, expect, it } from 'vitest';
import { buildState, caretOf, markdownOf, newIds, run } from '../test-support/build-state';
import { historyPlugin, undoInputRule } from '../state/history';
import { insertTextWithRules } from './input-rule';
import { blockInputRules } from './block-rules';
import { splitBlockWithRules } from './enter-rules';

type Entry = Parameters<typeof buildState>[0][number];
const type = (entry: Entry, offset: number, value: string) =>
  run(buildState([entry], { block: 0, offset }, { plugins: [historyPlugin()] }), insertTextWithRules(value, blockInputRules, { newId: newIds() })).state;

describe('block input rules', () => {
  it.each([
    ['##', 2, ' ', '## '],
    ['-', 1, ' ', '- '],
    ['3.', 2, ' ', '3. '],
    ['[]', 2, ' ', '- [ ] '],
    ['[x]', 3, ' ', '- [x] '],
    ['>', 1, ' ', '> '],
  ])('%j then %j makes %j', (paragraph, offset, value, expected) => {
    expect(markdownOf(type({ paragraph }, offset, value))).toEqual([expected]);
  });

  it('keeps text after the caret', () => {
    expect(markdownOf(type({ paragraph: '#tail' }, 1, ' '))).toEqual(['# tail']);
  });

  it('makes a divider followed by an empty paragraph', () => {
    const state = type({ paragraph: '--' }, 2, '-');
    expect(markdownOf(state)).toEqual(['<DIVIDER>', '']);
    expect(caretOf(state)).toEqual({ block: 1, offset: 0 });
  });

  it('makes a code block from a fence with a language', () => {
    expect(markdownOf(type({ paragraph: '```ts' }, 5, ' '))).toEqual(['<CODE>']);
  });

  it('only fires in paragraphs', () => {
    expect(markdownOf(type('## #', 1, ' '))).toEqual(['## \\#&#32;']);
  });

  it('turns a fenced paragraph into code on Enter', () => {
    const state = run(buildState([{ paragraph: '```js' }], { block: 0, offset: 5 }), splitBlockWithRules({ newId: newIds() })).state;
    expect(markdownOf(state)).toEqual(['<CODE>']);
  });

  it('is undone back to the typed text by undoInputRule', () => {
    expect(markdownOf(run(type({ paragraph: '#' }, 1, ' '), undoInputRule).state)).toEqual(['\\#&#32;']);
  });
});
