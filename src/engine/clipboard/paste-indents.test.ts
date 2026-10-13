import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../model/quoin-block';
import { buildState, markdownOf, newIds, run, type SelectionSpec } from '../test-support/build-state';
import { insertSlice } from './insert-slice';

const item = (id: string, markdown: string, indent = 0): QuoinBlock => ({
  id,
  type: 'MARKDOWN',
  data: { markdown },
  ...(indent > 0 ? { indent } : {}),
});
const IMAGE: QuoinBlock = { id: 'i', type: 'IMAGE', data: { storageKey: '', alt: '', caption: 'cap' } };
const DEEP_FIRST = [item('p', 'p', 2), item('q', 'q')];

const pasted = (blocks: Parameters<typeof buildState>[0], at: SelectionSpec, slice: QuoinBlock[], open = false) => {
  const state = buildState(blocks, at);
  const done = run(state, insertSlice({ blocks: slice, openStart: open, openEnd: open }, { newId: newIds('p') }));
  return markdownOf(done.state);
};

describe('indents of pasted blocks', () => {
  it.each<[string, Parameters<typeof buildState>[0], SelectionSpec, string[]]>([
    ['over a selected block', ['x', 'y'], { blocks: [1, 1] }, ['x', '  p', 'q']],
    ['at the end of a block', ['x', 'y'], { block: 0, offset: 1 }, ['x', '  p', 'q', 'y']],
    ['at the start of a block', ['x', 'y'], { block: 1, offset: 0 }, ['x', '  p', 'q', 'y']],
    ['at the start of the first block', ['x'], { block: 0, offset: 0 }, ['p', 'q', 'x']],
    ['in the middle of a block', ['xy'], { block: 0, offset: 1 }, ['x', '  p', 'q', 'y']],
    ['into an empty block', ['x', ''], { block: 1, offset: 0 }, ['x', '  p', 'q']],
    ['into an image caption', ['x', IMAGE], { block: 1, offset: 1, region: 'caption' }, ['x', '<IMAGE>', '  p', 'q']],
  ])('lifts a slice that starts deeper than it ends %s', (_, blocks, at, expected) => {
    expect(pasted(blocks, at, DEEP_FIRST)).toEqual(expected);
  });

  it('keeps the relative indents of a slice below an indented target', () => {
    const blocks = ['- top', item('a', '- a', 1)];
    const slice = [item('b', '- b'), item('c', '- c', 1), item('d', '- d', 2)];
    const expected = ['- top', '  - a', '  - b', '    - c', '      - d'];
    expect(pasted(blocks, { block: 1, offset: 1 }, slice)).toEqual(expected);
  });

  it('clamps a slice whose own indents skip a level and keeps its siblings level', () => {
    const slice = [item('b', '- b'), item('c', '- c', 3), item('d', '- d', 3), item('e', '- e', 1)];
    expect(pasted(['- a'], { block: 0, offset: 1 }, slice)).toEqual(['- a', '- b', '  - c', '  - d', '  - e']);
  });
});
