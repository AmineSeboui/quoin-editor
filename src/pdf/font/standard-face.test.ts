// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { standardFace } from './standard-face';
import { winAnsiCode } from './win-ansi';

const code = (char: string) => char.codePointAt(0)!;

describe('winAnsiCode', () => {
  it('maps printable ASCII and Latin-1 to themselves', () => {
    expect(winAnsiCode(code('A'))).toBe(0x41);
    expect(winAnsiCode(code('\u00E9'))).toBe(0xe9);
    expect(winAnsiCode(code('\u00A0'))).toBe(0xa0);
  });

  it('maps the typographic characters Windows places between 128 and 159', () => {
    expect(winAnsiCode(code('\u20AC'))).toBe(0x80);
    expect(winAnsiCode(code('\u2019'))).toBe(0x92);
    expect(winAnsiCode(code('\u2022'))).toBe(0x95);
    expect(winAnsiCode(code('\u2014'))).toBe(0x97);
    expect(winAnsiCode(code('\u0178'))).toBe(0x9f);
  });

  it('has no code for controls, for the five holes of the encoding, or for any other script', () => {
    for (const char of ['\n', '\u007F', '\u0081', '\u0101', '\u4E2D', '\u0627', '\u{1F600}']) expect(winAnsiCode(code(char))).toBeUndefined();
  });

  it('decodes back to the same character under windows-1252', () => {
    const decoder = new TextDecoder('windows-1252');
    for (let point = 0x20; point < 0x2200; point++) {
      const byte = winAnsiCode(point);
      if (byte !== undefined) expect(decoder.decode(Uint8Array.of(byte))).toBe(String.fromCodePoint(point));
    }
  });
});

describe('standardFace', () => {
  it('measures Helvetica with its AFM widths', () => {
    const face = standardFace('Helvetica');
    const widths = [...'Wil 0\u00E9\u20AC\u2014'].map((char) => face.advance(face.glyph(code(char))!));
    expect(widths).toEqual([944, 222, 222, 278, 556, 556, 556, 1000]);
  });

  it('measures the bold face with its own widths, and the oblique faces as their upright ones', () => {
    const bold = standardFace('Helvetica-Bold');
    expect([...'Wil'].map((char) => bold.advance(bold.glyph(code(char))!))).toEqual([944, 278, 278]);
    const oblique = standardFace('Helvetica-Oblique');
    expect(oblique.advance(code('W'))).toBe(944);
    expect(standardFace('Helvetica-BoldOblique').advance(code('i'))).toBe(278);
  });

  it('gives every Courier glyph the same width', () => {
    const face = standardFace('Courier-Bold');
    expect(new Set([...'iW \u00E9@'].map((char) => face.advance(face.glyph(code(char))!)))).toEqual(new Set([600]));
  });

  it('writes a glyph as the two hex digits of its byte', () => {
    expect(standardFace('Helvetica').hex(0x41)).toBe('41');
    expect(standardFace('Helvetica').hex(0x9)).toBe('09');
  });

  it('draws nothing outside its encoding', () => {
    expect(standardFace('Helvetica').glyph(code('\u4E2D'))).toBeUndefined();
  });
});
