import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { compareCodeUnits, compareRegionNames } from './compare';

const segment = fc.oneof(fc.stringMatching(/^[a-z]+$/), fc.stringMatching(/^\d+$/));
const regionName = fc.array(segment, { minLength: 1, maxLength: 4 }).map((parts) => parts.join(':'));
const anyName = fc
  .array(fc.string({ unit: fc.constantFrom('0', '1', '9', 'a', 'z', '-', ' ', ':', '\u00E9'), maxLength: 4 }), {
    minLength: 1,
    maxLength: 4,
  })
  .map((parts) => parts.join(':'));

describe('compareCodeUnits', () => {
  it('orders strings by UTF-16 code unit', () => {
    expect(compareCodeUnits('a', 'b')).toBe(-1);
    expect(compareCodeUnits('b', 'a')).toBe(1);
    expect(compareCodeUnits('a', 'a')).toBe(0);
    expect(compareCodeUnits('Z', 'a')).toBe(-1);
    expect(compareCodeUnits('ab', 'abc')).toBe(-1);
    expect(compareCodeUnits('\u{1F600}', '\uFFFF')).toBe(-1);
  });

  it('keeps canonically equivalent but distinct strings apart', () => {
    const composed = '\u00E9';
    const decomposed = 'e\u0301';
    expect(compareCodeUnits(composed, decomposed)).not.toBe(0);
    expect(compareCodeUnits(composed, decomposed)).toBe(-compareCodeUnits(decomposed, composed));
  });
});

describe('compareRegionNames', () => {
  it('compares numeric segments as numbers', () => {
    expect(compareRegionNames('cell:0:2', 'cell:0:10')).toBe(-1);
    expect(compareRegionNames('cell:10:0', 'cell:2:0')).toBe(1);
    expect(compareRegionNames('cell:2:0', 'cell:10:0')).toBe(-1);
  });

  it('compares numbers longer than a double exactly', () => {
    const small = '9007199254740993';
    const large = '9007199254740994';
    expect(compareRegionNames(`n:${small}`, `n:${large}`)).toBe(-1);
    expect(compareRegionNames(`n:${large}`, `n:${small}`)).toBe(1);
  });

  it('compares other segments by code unit', () => {
    expect(compareRegionNames('caption', 'text')).toBe(-1);
    expect(compareRegionNames('text', 'text')).toBe(0);
    expect(compareRegionNames('Text', 'caption')).toBe(-1);
  });

  it('sorts a name before its extensions', () => {
    expect(compareRegionNames('cell:0:1', 'cell:0:1:x')).toBe(-1);
    expect(compareRegionNames('cell:0:1:x', 'cell:0:1')).toBe(1);
  });

  it('places numeric segments before other segments', () => {
    expect(compareRegionNames('r:9', 'r:1a')).toBe(-1);
    expect(compareRegionNames('r:1a', 'r:10')).toBe(1);
    expect(compareRegionNames('r:', 'r:0')).toBe(1);
  });

  it('keeps numerically equal but distinct names apart', () => {
    const forward = compareRegionNames('cell:01:0', 'cell:1:0');
    expect(forward).not.toBe(0);
    expect(compareRegionNames('cell:1:0', 'cell:01:0')).toBe(-forward);
  });

  it.each([
    ['region-like names', regionName],
    ['arbitrary names', anyName],
  ])('is a total order over %s', (_label, names) => {
    fc.assert(
      fc.property(names, names, names, (a, b, c) => {
        const ab = compareRegionNames(a, b);
        expect(compareRegionNames(b, a) + ab).toBe(0);
        expect(ab === 0).toBe(a === b);
        if (ab <= 0 && compareRegionNames(b, c) <= 0) expect(compareRegionNames(a, c)).toBeLessThanOrEqual(0);
        expect(compareRegionNames(a, a)).toBe(0);
      }),
      { numRuns: 500 },
    );
  });

  it('sorts the same whatever the input order', () => {
    fc.assert(
      fc.property(fc.array(anyName, { maxLength: 8 }), (names) => {
        const sorted = [...names].sort(compareRegionNames);
        const reversed = [...names].reverse().sort(compareRegionNames);
        expect(reversed).toEqual(sorted);
      }),
    );
  });
});
