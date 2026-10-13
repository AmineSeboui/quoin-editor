import { describe, expect, it } from 'vitest';
import { buildState } from '../../engine/test-support/build-state';
import { orderedNumber } from './list-numbers';

describe('orderedNumber', () => {
  it('counts within a run and restarts after a break', () => {
    const { doc } = buildState([
      '3. a',
      '1. b',
      { id: 'x', type: 'MARKDOWN', data: { markdown: '- nested' }, indent: 1 },
      '1. c',
      'para',
      '1. d',
    ]);
    expect([0, 1, 3, 5].map((i) => orderedNumber(doc, i))).toEqual([3, 4, 5, 1]);
  });
});

describe('orderedNumber in nested lists', () => {
  it('numbers a deeper list on its own and resumes the outer run after it', () => {
    const { doc } = buildState([
      '1. a',
      { id: 'x', type: 'MARKDOWN', data: { markdown: '5. inner one' }, indent: 1 },
      { id: 'x', type: 'MARKDOWN', data: { markdown: '1. inner two' }, indent: 1 },
      '1. b',
      { id: 'x', type: 'MARKDOWN', data: { markdown: '1. second inner list' }, indent: 1 },
    ]);
    expect([0, 1, 2, 3, 4].map((i) => orderedNumber(doc, i))).toEqual([1, 5, 6, 2, 1]);
  });

  it('ends a run at a same-level block of another kind but not at a deeper one', () => {
    const { doc } = buildState([
      '1. a',
      { id: 'x', type: 'MARKDOWN', data: { markdown: 'deeper paragraph' }, indent: 1 },
      '1. b',
      '- bullet',
      '1. c',
    ]);
    expect([0, 2, 4].map((i) => orderedNumber(doc, i))).toEqual([1, 2, 1]);
  });

  it('answers for a long list without walking it again for every item', () => {
    const { doc } = buildState(Array.from({ length: 2000 }, (_, i) => `${i + 1}. item`));
    expect(orderedNumber(doc, 1999)).toBe(2000);
    expect(orderedNumber(doc, 0)).toBe(1);
  });
});
