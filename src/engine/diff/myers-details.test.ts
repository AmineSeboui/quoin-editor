import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { diffSequences } from './myers';

function lcsLength(a: readonly number[], b: readonly number[]): number {
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table[0][0];
}

const small = fc.array(fc.integer({ min: 0, max: 3 }), { maxLength: 14 });

describe('diffSequences details', () => {
  it('returns no ops for two empty sequences', () => {
    expect(diffSequences([], [])).toEqual([]);
  });

  it('returns one equal op for identical sequences', () => {
    expect(diffSequences([1, 2, 3], [1, 2, 3])).toEqual([{ op: 'equal', items: [1, 2, 3] }]);
  });

  it('inserts everything into an empty sequence and deletes everything to reach one', () => {
    expect(diffSequences([], [1, 2])).toEqual([{ op: 'insert', items: [1, 2] }]);
    expect(diffSequences([1, 2], [])).toEqual([{ op: 'delete', items: [1, 2] }]);
  });

  it('puts deletions before insertions in a replaced run', () => {
    expect(diffSequences([1, 2, 3], [1, 9, 8, 3])).toEqual([
      { op: 'equal', items: [1] },
      { op: 'delete', items: [2] },
      { op: 'insert', items: [9, 8] },
      { op: 'equal', items: [3] },
    ]);
  });

  it('never leaves two neighbouring ops of the same kind', () => {
    fc.assert(
      fc.property(small, small, (a, b) => {
        const ops = diffSequences(a, b);
        ops.forEach((op, i) => {
          expect(op.items.length).toBeGreaterThan(0);
          if (i > 0) expect(op.op).not.toBe(ops[i - 1].op);
        });
      }),
    );
  });

  it('removes and adds as few items as the longest common subsequence allows', () => {
    fc.assert(
      fc.property(small, small, (a, b) => {
        const kept = diffSequences(a, b)
          .filter((op) => op.op === 'equal')
          .reduce((sum, op) => sum + op.items.length, 0);
        expect(kept).toBe(lcsLength(a, b));
      }),
    );
  });

  it('uses the given equality and keeps the items of the first sequence in equal ops', () => {
    const ops = diffSequences(['A', 'b'], ['a', 'x'], (x, y) => x.toLowerCase() === y.toLowerCase());
    expect(ops).toEqual([
      { op: 'equal', items: ['A'] },
      { op: 'delete', items: ['b'] },
      { op: 'insert', items: ['x'] },
    ]);
  });

  it('does not change its inputs', () => {
    const a = Object.freeze([1, 2, 3]);
    const b = Object.freeze([3, 2, 1]);
    expect(() => diffSequences(a, b)).not.toThrow();
  });

  it('handles a long sequence with a few edits', () => {
    const a = Array.from({ length: 5000 }, (_, i) => i);
    const b = a.filter((n) => n !== 100 && n !== 4000);
    expect(diffSequences(a, b)).toEqual([
      { op: 'equal', items: a.slice(0, 100) },
      { op: 'delete', items: [100] },
      { op: 'equal', items: a.slice(101, 4000) },
      { op: 'delete', items: [4000] },
      { op: 'equal', items: a.slice(4001) },
    ]);
  });
});
