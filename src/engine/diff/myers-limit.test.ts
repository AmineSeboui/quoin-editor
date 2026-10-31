import { describe, expect, it } from 'vitest';
import { diffSequences, MAX_EDITS } from './myers';

const range = (from: number, length: number) => Array.from({ length }, (_, at) => from + at);

describe('diffSequences past its edit limit', () => {
  it('still finds the shortest edit at the limit', () => {
    const a = range(0, MAX_EDITS / 2 + 10);
    const b = [...range(-MAX_EDITS / 2, MAX_EDITS / 2), ...a.slice(MAX_EDITS / 2)];
    expect(diffSequences(a, b)).toEqual([
      { op: 'delete', items: a.slice(0, MAX_EDITS / 2) },
      { op: 'insert', items: b.slice(0, MAX_EDITS / 2) },
      { op: 'equal', items: a.slice(MAX_EDITS / 2) },
    ]);
  });

  it('deletes and inserts both sequences whole past the limit', () => {
    const a = [1, 2, ...range(100, MAX_EDITS), 3];
    const b = [1, 2, ...range(-MAX_EDITS, MAX_EDITS), 3];
    expect(diffSequences(a, b)).toEqual([
      { op: 'delete', items: a },
      { op: 'insert', items: b },
    ]);
    expect(diffSequences(range(0, MAX_EDITS + 1), [])).toEqual([{ op: 'delete', items: range(0, MAX_EDITS + 1) }]);
  });

  it('compares a bounded number of items for two long sequences with nothing in common', () => {
    let compared = 0;
    const equal = (x: number, y: number) => {
      compared++;
      return x === y;
    };
    const a = range(0, 50_000);
    const b = range(100_000, 50_000);
    expect(diffSequences(a, b, equal)).toEqual([
      { op: 'delete', items: a },
      { op: 'insert', items: b },
    ]);
    expect(compared).toBeLessThan(MAX_EDITS * MAX_EDITS);
  });
});
