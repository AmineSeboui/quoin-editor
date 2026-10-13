import { describe, expect, it } from 'vitest';
import { buildState, markdownOf, run } from '../test-support/build-state';
import { indent, outdent } from './block-structure';

const item = (id: string, level = 0) => ({ id, type: 'MARKDOWN', data: { markdown: `- ${id}` }, indent: level });

describe('Tab and Shift+Tab move whole subtrees or nothing', () => {
  it('does nothing when the block cannot indent, children included', () => {
    const state = buildState([item('b'), item('c', 1), item('d', 1)], { block: 0, offset: 0 });
    const { ok, state: next } = run(state, indent);
    expect(ok).toBe(false);
    expect(markdownOf(next)).toEqual(['- b', '  - c', '  - d']);
  });

  it('does nothing when the first of several selected siblings cannot indent', () => {
    const state = buildState([item('a'), item('b', 1), item('c', 1)], { blocks: [1, 2] });
    const { ok, state: next } = run(state, indent);
    expect(ok).toBe(false);
    expect(markdownOf(next)).toEqual(['- a', '  - b', '  - c']);
  });

  it('does nothing when Shift+Tab meets a block already at the left edge, children included', () => {
    const state = buildState([item('a'), item('b', 1), item('c', 2)], { block: 0, offset: 0 });
    const { ok, state: next } = run(state, outdent);
    expect(ok).toBe(false);
    expect(markdownOf(next)).toEqual(['- a', '  - b', '    - c']);
  });

  it('outdents a block with its subtree and leaves the next sibling where it is', () => {
    const state = buildState([item('a'), item('b', 1), item('c', 2), item('d', 1)], { block: 1, offset: 0 });
    expect(markdownOf(run(state, outdent).state)).toEqual(['- a', '- b', '  - c', '  - d']);
  });

  it('indents selected siblings together under the block before them', () => {
    const state = buildState([item('a'), item('b'), item('x', 1), item('c')], { blocks: [1, 3] });
    expect(markdownOf(run(state, indent).state)).toEqual(['- a', '  - b', '    - x', '  - c']);
  });
});
