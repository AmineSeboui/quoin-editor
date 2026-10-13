import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { diffSequences } from './myers';

describe('diffSequences', () => {
  it('finds a minimal edit script', () => {
    expect(diffSequences([...'abcabba'], [...'cbabac'])).toEqual([
      { op: 'delete', items: ['a', 'b'] },
      { op: 'equal', items: ['c'] },
      { op: 'insert', items: ['b'] },
      { op: 'equal', items: ['a', 'b'] },
      { op: 'delete', items: ['b'] },
      { op: 'equal', items: ['a'] },
      { op: 'insert', items: ['c'] },
    ]);
  });

  it('always rebuilds both sides', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 4 })), fc.array(fc.integer({ min: 0, max: 4 })), (a, b) => {
        const ops = diffSequences(a, b);
        expect(ops.filter((o) => o.op !== 'insert').flatMap((o) => o.items)).toEqual(a);
        expect(ops.filter((o) => o.op !== 'delete').flatMap((o) => o.items)).toEqual(b);
      }),
    );
  });
});
