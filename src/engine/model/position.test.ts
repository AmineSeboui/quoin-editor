import { describe, expect, it } from 'vitest';
import { createDoc } from './doc';
import { comparePos, orderedRange } from './position';
import type { EngineBlock } from './types';

const block = (id: string): EngineBlock => ({ id, type: 'MARKDOWN', indent: 0, attrs: {}, regions: { text: [] } });
const doc = createDoc([block('a'), block('b')]);
const p = (block: string, offset: number) => ({ block, region: 'text', offset });

describe('positions', () => {
  it('orders by block index, then region name, then offset', () => {
    expect(comparePos(doc, p('a', 3), p('b', 0))).toBeLessThan(0);
    expect(comparePos(doc, p('b', 2), p('b', 1))).toBeGreaterThan(0);
    expect(comparePos(doc, p('a', 1), p('a', 1))).toBe(0);
    expect(comparePos(doc, { block: 'a', region: 'body', offset: 9 }, p('a', 0))).toBeLessThan(0);
  });

  it('returns a range in document order', () => {
    expect(orderedRange(doc, p('b', 1), p('a', 2))).toEqual({ from: p('a', 2), to: p('b', 1) });
    expect(orderedRange(doc, p('a', 2), p('b', 1))).toEqual({ from: p('a', 2), to: p('b', 1) });
  });

  it('throws for a position in a missing block', () => {
    expect(() => comparePos(doc, p('z', 0), p('a', 0))).toThrow(/no block "z"/);
  });
});
