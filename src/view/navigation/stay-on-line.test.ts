import { describe, expect, it } from 'vitest';
import type { Pos } from '../../engine';
import { textSelection } from '../../engine/state/selection';
import { stayOnLine, type Glyph } from './stay-on-line';

const pos = (offset: number): Pos => ({ block: 'a', region: 'text', offset });
const glyph = (top: number, text = 'x'): Glyph => ({ rect: { top, bottom: top + 20 } as DOMRect, text });
const wrapAt = (offset: number, before = 'x') => (at: number) =>
  at < offset - 1 ? glyph(30) : at === offset - 1 ? glyph(30, before) : glyph(60);

describe('stayOnLine', () => {
  it('keeps a position drawn on the intended line', () => {
    expect(stayOnLine(pos(10), 35, () => glyph(30))).toEqual(textSelection(pos(10)));
  });

  it('steps back over the space a soft wrap falls after, so typed text stays on the line', () => {
    expect(stayOnLine(pos(10), 35, wrapAt(10, ' '))).toEqual(textSelection(pos(9)));
  });

  it('draws the caret before a soft wrap that falls after a visible glyph', () => {
    expect(stayOnLine(pos(10), 35, wrapAt(10, '-'))).toEqual({ ...textSelection(pos(10)), assoc: -1 });
  });

  it('keeps the start of the next line when that is the line aimed at', () => {
    expect(stayOnLine(pos(10), 65, wrapAt(10, ' '))).toEqual(textSelection(pos(10)));
  });

  it('keeps the start and the end of a region', () => {
    expect(stayOnLine(pos(0), 35, () => glyph(60))).toEqual(textSelection(pos(0)));
    expect(stayOnLine(pos(10), 35, (at) => (at < 10 ? glyph(30) : null))).toEqual(textSelection(pos(10)));
  });

  it('keeps the position when nothing can be measured', () => {
    expect(stayOnLine(pos(10), 35, () => null)).toEqual(textSelection(pos(10)));
  });
});
