import { describe, expect, it } from 'vitest';
import { buildState } from '../engine/test-support/build-state';
import { handleTargets, styleTargets } from './block-targets';

const nested = ['- a', { id: 'x', type: 'MARKDOWN', data: { markdown: '- child' }, indent: 1 }, 'b', 'c'] as const;

describe('handleTargets', () => {
  it('uses the selection when the handle block is in it, else the block and its children', () => {
    const range = buildState([...nested], { blocks: [2, 3] });
    expect(handleTargets(range, 'b2')).toEqual(['b2', 'b3']);
    expect(handleTargets(range, 'b0')).toEqual(['b0', 'b1']);
  });

  it('takes every block a text selection crosses, and a caret as its own block', () => {
    const across = buildState(['a', 'b', 'c'], { anchor: { block: 0, offset: 0 }, head: { block: 1, offset: 1 } });
    expect(handleTargets(across, 'b1')).toEqual(['b0', 'b1']);
    const caret = buildState(['a', 'b'], { block: 1, offset: 0 });
    expect(handleTargets(caret, 'b1')).toEqual(['b1']);
  });
});

describe('styleTargets', () => {
  it('styles the handle block alone, never the blocks nested under it', () => {
    expect(styleTargets(buildState([...nested], null), 'b0')).toEqual(['b0']);
    expect(styleTargets(buildState([...nested], { block: 0, offset: 0 }), 'b0')).toEqual(['b0']);
  });

  it('styles the selected blocks when the handle block is among them, and the handle block alone otherwise', () => {
    const range = buildState([...nested], { blocks: [2, 3] });
    expect(styleTargets(range, 'b2')).toEqual(['b2', 'b3']);
    expect(styleTargets(range, 'b0')).toEqual(['b0']);
  });
});
