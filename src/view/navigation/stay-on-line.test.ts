import { describe, expect, it } from 'vitest';
import type { Pos } from '../../engine';
import { stayOnLine } from './stay-on-line';

const pos = (offset: number): Pos => ({ block: 'a', region: 'text', offset });
const line = (top: number, height = 20) => ({ top, bottom: top + height, height }) as DOMRect;

describe('stayOnLine', () => {
  it('keeps a position drawn on the intended line', () => {
    expect(stayOnLine(pos(10), 35, () => line(30))).toEqual(pos(10));
  });

  it('steps back from a soft wrap that would draw the caret on the next line', () => {
    const rectAt = (p: Pos) => (p.offset >= 10 ? line(60) : line(30));
    expect(stayOnLine(pos(10), 35, rectAt)).toEqual(pos(9));
  });

  it('keeps the position when stepping back does not reach the line either', () => {
    expect(stayOnLine(pos(10), 35, () => line(60))).toEqual(pos(10));
  });

  it('does not step back from the start of a region', () => {
    expect(stayOnLine(pos(0), 35, () => line(60))).toEqual(pos(0));
  });

  it('keeps the position when nothing can be measured', () => {
    expect(stayOnLine(pos(10), 35, () => null)).toEqual(pos(10));
  });
});
