import { describe, expect, it } from 'vitest';
import { edgeAt } from './table-geometry';

const spans = [
  { start: 10, size: 30 },
  { start: 40, size: 50 },
];

describe('edgeAt', () => {
  it('is where the edge before a span is drawn, and the edge after the last one at their count', () => {
    expect([0, 1, 2].map((edge) => edgeAt(spans, edge))).toEqual([10, 40, 90]);
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
