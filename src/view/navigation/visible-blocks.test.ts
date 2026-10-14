import { describe, expect, it } from 'vitest';
import { buildState } from '../../engine/test-support/build-state';
import { visibleBlockIndexes } from './visible-blocks';

describe('visibleBlockIndexes', () => {
  it('skips the children of a closed toggle', () => {
    const { doc } = buildState([
      { id: 't', type: 'TOGGLE', data: { markdown: 'T', open: false } },
      { id: 'c', type: 'MARKDOWN', data: { markdown: 'child' }, indent: 1 },
      { id: 'g', type: 'MARKDOWN', data: { markdown: 'grandchild' }, indent: 2 },
      'after',
      { id: 'o', type: 'TOGGLE', data: { markdown: 'O', open: true } },
      { id: 'd', type: 'MARKDOWN', data: { markdown: 'shown' }, indent: 1 },
    ]);
    expect(visibleBlockIndexes(doc)).toEqual([0, 3, 4, 5]);
  });
});
