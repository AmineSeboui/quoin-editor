// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { tinyFont } from '../test-support/tiny-font';
import { readTrueType, type TrueType } from './truetype';

const glyphs = [
  ['A', 600],
  ['b', 500],
  ['\u00E9', 520],
  ['\u4E2D', 1000],
  ['\u{20B9F}', 980],
] as const;

const read = (bytes: Uint8Array) => {
  const font = readTrueType(bytes);
  if (typeof font === 'string') throw new Error(font);
  return font;
};

const advanceOf = (font: TrueType, char: string) => font.advance(font.glyphOf(char.codePointAt(0)!));

describe('readTrueType', () => {
  it('reads the metrics a font descriptor needs', () => {
    const font = read(tinyFont({ glyphs: glyphs.slice(0, 4), name: 'Tiny-Bold', italicAngle: -12 }));
    expect(font).toMatchObject({
      name: 'Tiny-Bold',
      unitsPerEm: 1000,
      ascent: 780,
      descent: -220,
      capHeight: 680,
      bbox: [0, 0, 1000, 700],
      italicAngle: -12,
    });
  });

  it('finds glyphs through a format 4 character map', () => {
    const font = read(tinyFont({ glyphs: glyphs.slice(0, 4) }));
    expect([...'Ab\u00E9\u4E2D'].map((char) => advanceOf(font, char))).toEqual([600, 500, 520, 1000]);
    expect(font.glyphOf('z'.codePointAt(0)!)).toBe(0);
  });

  it('finds glyphs beyond the basic plane through a format 12 character map', () => {
    const font = read(tinyFont({ glyphs, cmapFormat: 12 }));
    expect(advanceOf(font, '\u{20B9F}')).toBe(980);
    expect(advanceOf(font, 'A')).toBe(600);
    expect(font.glyphOf(0x20ba0)).toBe(0);
  });

  it('scales nothing itself, leaving the units per em to the caller', () => {
    const font = read(tinyFont({ glyphs: [['A', 1024]], unitsPerEm: 2048 }));
    expect([font.unitsPerEm, advanceOf(font, 'A')]).toEqual([2048, 1024]);
  });

  it('keeps the bytes it was given to embed', () => {
    const bytes = tinyFont({ glyphs: glyphs.slice(0, 2) });
    expect(read(bytes).bytes).toBe(bytes);
  });

  it('refuses a font whose licence forbids embedding it, or allows only its bitmaps', () => {
    expect(readTrueType(tinyFont({ glyphs: [['A', 600]], fsType: 0x0002 }))).toBe('restricted');
    expect(readTrueType(tinyFont({ glyphs: [['A', 600]], fsType: 0x0200 }))).toBe('restricted');
    expect(typeof readTrueType(tinyFont({ glyphs: [['A', 600]], fsType: 0x0008 }))).toBe('object');
  });

  it('refuses a collection, an OpenType font with PostScript outlines, a web font and bytes that are no font', () => {
    const outlinesOf = (tag: string) => Uint8Array.from([...tag].map((char) => char.charCodeAt(0)).concat(Array(60).fill(0)));
    for (const tag of ['ttcf', 'OTTO', 'wOFF', 'wOF2']) expect(readTrueType(outlinesOf(tag))).toBe('format');
    expect(readTrueType(new TextEncoder().encode('not a font at all'))).toBe('format');
    expect(readTrueType(tinyFont({ glyphs: [['A', 600]] }).subarray(0, 40))).toBe('format');
  });
});
