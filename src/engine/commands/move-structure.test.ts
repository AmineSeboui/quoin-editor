import { describe, expect, it } from 'vitest';
import { buildState, markdownOf, run } from '../test-support/build-state';
import { moveBlocksDown, moveBlocksUp } from './block-structure';

const item = (id: string, level = 0) => ({ id, type: 'MARKDOWN', data: { markdown: `- ${id}` }, indent: level });

describe('moving blocks keeps the tree inside and around the moved range', () => {
  it('keeps a child under its parent when only another part of the range is lifted', () => {
    const state = buildState([item('a'), item('b', 1), item('c', 2), item('d'), item('e', 1)], { blocks: [2, 3] });
    expect(markdownOf(run(state, moveBlocksUp).state)).toEqual(['- a', '  - c', '- d', '  - e', '  - b']);
  });

  it('keeps siblings inside the moved range level with each other', () => {
    const state = buildState([item('a'), item('b', 1), item('p', 2), item('q', 3), item('r', 3)], { block: 2, offset: 0 });
    expect(markdownOf(run(state, moveBlocksUp).state)).toEqual(['- a', '  - p', '    - q', '    - r', '  - b']);
  });

  it('lifts the blocks it hopped over when the range ends shallower than they start', () => {
    const state = buildState([item('a'), item('b', 1), item('c', 2), item('x', 2), item('y')], { blocks: [3, 4] });
    expect(markdownOf(run(state, moveBlocksUp).state)).toEqual(['- a', '  - b', '    - x', '- y', '  - c']);
  });

  it('lifts a deep range moved below a shallow block, keeping its siblings level', () => {
    const blocks = [item('a'), item('b', 1), item('c', 2), item('x', 3), item('y', 4), item('z', 3), item('d'), item('e')];
    const state = buildState(blocks, { blocks: [3, 6] });
    const moved = ['- a', '  - b', '    - c', '- e', '  - x', '    - y', '  - z', '- d'];
    expect(markdownOf(run(state, moveBlocksDown).state)).toEqual(moved);
  });
});
