import { describe, expect, it } from 'vitest';
import { edgeAt, edgeNear, spanAt } from './table-geometry';

const spans = [
  { start: 10, size: 30 },
  { start: 40, size: 50 },
];

// The same two columns as a right to left page draws them, the first one on the right.
const rightToLeft = [
  { start: 40, size: 50 },
  { start: 10, size: 30 },
];

describe('spanAt', () => {
  const points = [5, 10, 39, 40, 89, 95];

  it('is the span that holds a point, or the nearest one', () => {
    expect(points.map((at) => spanAt(spans, at))).toEqual([0, 0, 0, 1, 1, 1]);
  });

  it('is the same span whichever way the spans run', () => {
    expect(points.map((at) => spanAt(rightToLeft, at))).toEqual([1, 1, 1, 0, 0, 0]);
  });

  it('is -1 where there are no spans', () => {
    expect(spanAt([], 5)).toBe(-1);
  });
});

describe('edgeAt', () => {
  it('is where the edge before a span is drawn, and the edge after the last one at their count', () => {
    expect([0, 1, 2].map((edge) => edgeAt(spans, edge))).toEqual([10, 40, 90]);
  });

  it('is on the right of a span where the spans run right to left', () => {
    expect([0, 1, 2].map((edge) => edgeAt(rightToLeft, edge, 'rtl'))).toEqual([90, 40, 10]);
  });

  it.each([
    ['no edge', spans, null],
    ['an edge past the last span', spans, 3],
    ['an edge before the first span', spans, -1],
    ['an edge between two numbers', spans, 0.5],
    ['an edge of a table with no spans', [], 0],
  ])('is nothing for %s', (_case, given, edge) => {
    expect(edgeAt(given, edge)).toBeNull();
  });
});

describe('edgeNear', () => {
  it('is the edge within reach of a point, numbered from the first span', () => {
    expect([12, 43, 88, 25].map((at) => edgeNear(spans, at, 4))).toEqual([0, 1, 2, null]);
  });

  it('numbers the edges from the right where the spans run right to left', () => {
    expect([88, 37, 12, 25].map((at) => edgeNear(rightToLeft, at, 4, 'rtl'))).toEqual([0, 1, 2, null]);
  });

  it('is nothing for a table with no spans', () => {
    expect(edgeNear([], 0, 4)).toBeNull();
  });
});
