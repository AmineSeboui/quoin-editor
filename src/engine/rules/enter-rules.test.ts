import { describe, expect, it, vi } from 'vitest';
import { blocksOf, buildState, caretOf, markdownOf, newIds, run } from '../test-support/build-state';
import { splitBlockWithRules } from './enter-rules';

type Entry = Parameters<typeof buildState>[0][number];
type Selection = Parameters<typeof buildState>[1];

const enter = (entry: Entry, selection: Selection) => run(buildState([entry], selection), splitBlockWithRules({ newId: newIds() }));

describe('splitBlockWithRules', () => {
  it.each([
    ['```', ''],
    ['```ts', 'ts'],
    ['```c++', 'c++'],
    ['```c#', 'c#'],
  ])('turns the paragraph %j into a code block with language %j', (paragraph, language) => {
    const { state } = enter({ paragraph }, { block: 0, offset: paragraph.length });
    expect(blocksOf(state)).toEqual([{ id: 'b0', type: 'CODE', data: { language, code: '' } }]);
    expect(caretOf(state)).toEqual({ node: 0 });
  });

  it('splits like splitBlock for any other text', () => {
    const { state } = enter({ paragraph: 'abc' }, { block: 0, offset: 1 });
    expect(markdownOf(state)).toEqual(['a', 'bc']);
    expect(caretOf(state)).toEqual({ block: 1, offset: 0 });
  });

  it.each([
    ['a fence with a space', { paragraph: '``` ts' }, { block: 0, offset: 6 }],
    ['a fence with more text', { paragraph: '```ts x' }, { block: 0, offset: 7 }],
    ['a caret inside the fence', { paragraph: '```ts' }, { block: 0, offset: 3 }],
    ['a selection', { paragraph: '```ts' }, { anchor: { block: 0, offset: 3 }, head: { block: 0, offset: 5 } }],
    ['a heading', '## ```ts', { block: 0, offset: 5 }],
    ['a list item', '- \\`\\`\\`ts', { block: 0, offset: 5 }],
  ])('does not turn %s into code', (_label, entry, selection) => {
    const { state } = enter(entry, selection);
    expect(state.doc.blocks.every((block) => block.type === 'MARKDOWN')).toBe(true);
  });

  it('does nothing for block selections', () => {
    expect(run(buildState(['a', 'b'], { blocks: [0, 1] }), splitBlockWithRules()).ok).toBe(false);
  });

  it('answers a dry run without dispatching and dispatches once otherwise', () => {
    const state = buildState([{ paragraph: '```' }], { block: 0, offset: 3 });
    const dispatch = vi.fn();
    expect(splitBlockWithRules()(state)).toBe(true);
    expect(splitBlockWithRules()(state, dispatch)).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
