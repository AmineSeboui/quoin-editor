import { describe, expect, it } from 'vitest';
import { buildState, caretOf, markdownOf, newIds, run } from '../test-support/build-state';
import { duplicateBlocks } from './block-structure';

const item = (id: string, level = 0) => ({ id, type: 'MARKDOWN', data: { markdown: `- ${id}` }, indent: level });

describe('duplicating a range that ends shallower than it starts', () => {
  it('lifts the copy so it hangs under the end of the original', () => {
    const state = buildState([item('a'), item('b', 1), item('p', 2), item('q')], { blocks: [2, 3] });
    const next = run(state, duplicateBlocks({ newId: newIds() })).state;
    expect(markdownOf(next)).toEqual(['- a', '  - b', '    - p', '- q', '  - p', '- q']);
    expect(caretOf(next)).toEqual({ blocks: [4, 5] });
  });
});
