// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { fontSet } from '../font/font-set';
import { hostFace } from '../font/host-face';
import type { StandardFace } from '../font/standard-face';
import { readTrueType, type TrueType } from '../font/truetype';
import { tinyFont } from '../test-support/tiny-font';
import { glyphItems } from './glyph-items';
import { BODY, type TextStyle } from './text-style';

const standard = fontSet({});
const piece = (text: string, style: Partial<TextStyle> = {}) => ({ text, style: { ...BODY, ...style } });
const faceName = (item: { use?: { face: unknown } }) => (item.use?.face as StandardFace | undefined)?.name;
const tiny = (glyphs: [string, number][]) => hostFace(readTrueType(tinyFont({ glyphs })) as TrueType);

describe('glyphItems', () => {
  it('measures each character with the standard face of its style, in points', () => {
    const items = glyphItems([piece('Wi'), piece('W', { bold: true }), piece('i', { mono: true })], standard);
    expect(items.map(({ text, width }) => [text, Number(width.toFixed(3))])).toEqual([
      ['W', 10.384],
      ['i', 2.442],
      ['W', 10.384],
      ['i', 6.6],
    ]);
    expect(items.map(faceName)).toEqual(['Helvetica', 'Helvetica', 'Helvetica-Bold', 'Courier']);
  });

  it('draws subscripts and superscripts smaller', () => {
    const [sub] = glyphItems([piece('W', { script: 'sub' })], standard);
    expect(sub.width).toBeCloseTo(10.384 * 0.7);
  });

  it('marks spaces as places to break, but not a no-break space', () => {
    const items = glyphItems([piece('a b\u00A0c\u3000d')], standard);
    expect(items.map(({ space }) => space)).toEqual([false, true, false, false, false, true, false]);
  });

  it('turns line breaks into breaks, however they are written', () => {
    const items = glyphItems([piece('a\r\nb\rc\nd')], standard);
    expect(items.map(({ newline, text }) => (newline ? '|' : text)).join('')).toBe('a|b|c|d');
  });

  it('expands a tab to the next stop of four columns', () => {
    const items = glyphItems([piece('ab\tc\n\td', { mono: true })], standard);
    expect(items.map(({ text, newline }) => (newline ? '|' : text)).join('')).toBe('ab  c|    d');
  });

  it('composes a letter and its accent written apart, so the standard face draws them', () => {
    const items = glyphItems([piece('e\u0301')], standard);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ text: '\u00E9', glyph: 0xe9 });
  });

  it('leaves out the invisible characters that join, select variants or hint where to break', () => {
    expect(glyphItems([piece('a\u200Bb\u00ADc\uFEFFd')], standard).map(({ text }) => text).join('')).toBe('abcd');
  });

  it('draws a character no face has as one box, one box for a sequence that reads as a single emoji', () => {
    const items = glyphItems([piece('a\u4E2D\u26A0\uFE0F\u{1F468}\u200D\u{1F469}\u{1F44D}\u{1F3FD}\u{1F1EB}\u{1F1F7}b')], standard);
    expect(items.map(({ text, use }) => (use ? text : `[${text}]`))).toEqual([
      'a',
      '[\u4E2D]',
      '[\u26A0]',
      '[\u{1F468}\u{1F469}]',
      '[\u{1F44D}\u{1F3FD}]',
      '[\u{1F1EB}\u{1F1F7}]',
      'b',
    ]);
    expect(items[1].width).toBeCloseTo(BODY.size * 0.6);
  });

  it('prefers a host face to the standard one, and falls back for what it cannot draw', () => {
    const regular = tiny([['a', 500], ['\u4E2D', 1000]]);
    const items = glyphItems([piece('a\u4E2Db')], fontSet({ regular }));
    expect(items.map(({ use }) => use?.face === regular)).toEqual([true, true, false]);
    expect(items.map(({ width }) => Number(width.toFixed(3)))).toEqual([5.5, 11, 6.116]);
    expect(faceName(items[2])).toBe('Helvetica');
  });

  it('fakes bold and italic on the regular host face when the host gave no face of that style', () => {
    const regular = tiny([['a', 500]]);
    const [boldItalic] = glyphItems([piece('a', { bold: true, italic: true })], fontSet({ regular }));
    expect(boldItalic.use).toMatchObject({ face: regular, fakeBold: true, fakeItalic: true });
    const bold = tiny([['a', 600]]);
    const [real] = glyphItems([piece('a', { bold: true, italic: true })], fontSet({ regular, bold }));
    expect(real.use).toMatchObject({ face: bold, fakeBold: false, fakeItalic: true });
  });

  it('keeps code in the monospaced host face, then Courier, before the regular host face', () => {
    const mono = tiny([['a', 600]]);
    const regular = tiny([['\u4E2D', 1000]]);
    const items = glyphItems([piece('ab\u4E2D', { mono: true })], fontSet({ regular, mono }));
    expect(items.map(({ use }) => (use?.face === mono ? 'mono' : use?.face === regular ? 'regular' : faceName({ use })))).toEqual([
      'mono',
      'Courier',
      'regular',
    ]);
  });
});
