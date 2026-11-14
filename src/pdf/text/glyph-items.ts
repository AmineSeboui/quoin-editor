import type { FaceUse } from '../font/face';
import type { FontSet } from '../font/font-set';
import { drawnSize, type TextStyle } from './text-style';

export type Piece = { readonly text: string; readonly style: TextStyle };

/** A glyph placed in a line, or, with no face, a box standing for characters no face draws. */
export type GlyphItem = {
  readonly text: string;
  readonly style: TextStyle;
  readonly width: number;
  readonly use?: FaceUse;
  readonly glyph: number;
  readonly space: boolean;
  readonly newline: boolean;
};

const TAB_STOP = 4;
const MISSING_WIDTH = 0.6;
const ZERO_WIDTH_JOINER = 0x200d;
// The default ignorable characters a font draws nothing for: joiners, marks of direction and variation selectors.
const IGNORED: readonly (readonly [number, number])[] = [
  [0xad, 0xad],
  [0x34f, 0x34f],
  [0x61c, 0x61c],
  [0x180b, 0x180f],
  [0x200b, 0x200c],
  [0x200e, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x206f],
  [0xfe00, 0xfe0f],
  [0xfeff, 0xfeff],
  [0xe0000, 0xe0fff],
];
const isIgnored = (point: number) => IGNORED.some(([low, high]) => point >= low && point <= high);
const BREAKING_SPACE = /(?![\u00A0\u2007\u202F])\p{Zs}/u;
const IDEOGRAPHIC_SPACE = 0x3000;
const MARK = /\p{M}/u;
const isModifier = (point: number) => point >= 0x1f3fb && point <= 0x1f3ff;
const isRegional = (point: number) => point >= 0x1f1e6 && point <= 0x1f1ff;

// A skin tone, a combining mark, the second half of a flag, or what follows a joiner belongs to the box before it.
function attaches(point: number, char: string, before: GlyphItem, joining: boolean): boolean {
  if (before.use || before.newline) return false;
  const lone = [...before.text].length === 1 && isRegional(before.text.codePointAt(0)!);
  return joining || isModifier(point) || MARK.test(char) || (isRegional(point) && lone);
}

function measured(text: string, style: TextStyle, use: FaceUse, glyph: number, space: boolean): GlyphItem {
  const width = (use.face.advance(glyph) / 1000) * drawnSize(style);
  return { text, style, width, use, glyph, space, newline: false };
}

function spaceItem(text: string, style: TextStyle, fonts: FontSet, breaking: boolean): GlyphItem {
  const use = fonts.use(0x20, style)!;
  const item = measured(text, style, use, use.face.glyph(0x20)!, breaking);
  return text.codePointAt(0) === IDEOGRAPHIC_SPACE ? { ...item, width: drawnSize(style) } : item;
}

/** The glyphs of `pieces`, each character drawn by the first face of its style that has it. */
export function glyphItems(pieces: readonly Piece[], fonts: FontSet): GlyphItem[] {
  const items: GlyphItem[] = [];
  let column = 0;
  let joining = false;
  for (const { text, style } of pieces) {
    for (const char of text.normalize('NFC').replace(/\r\n?/g, '\n')) {
      const point = char.codePointAt(0)!;
      if (char === '\n' || char === '\t') {
        const count = char === '\n' ? 0 : TAB_STOP - (column % TAB_STOP);
        if (char === '\n') items.push({ text: '\n', style, width: 0, glyph: 0, space: false, newline: true });
        for (let at = 0; at < count; at++) items.push(spaceItem(' ', style, fonts, true));
        column = char === '\n' ? 0 : column + count;
        joining = false;
        continue;
      }
      if (point === ZERO_WIDTH_JOINER) joining = true;
      if (point === ZERO_WIDTH_JOINER || isIgnored(point)) continue;
      column++;
      const use = fonts.use(point, style);
      const before = items[items.length - 1];
      if (!use && before && attaches(point, char, before, joining)) {
        items[items.length - 1] = { ...before, text: before.text + char };
      } else if (use) {
        items.push(measured(char, style, use, use.face.glyph(point)!, BREAKING_SPACE.test(char)));
      } else if (/\p{Zs}/u.test(char)) {
        items.push(spaceItem(char, style, fonts, BREAKING_SPACE.test(char)));
      } else {
        items.push({ text: char, style, width: MISSING_WIDTH * drawnSize(style), glyph: 0, space: false, newline: false });
      }
      joining = false;
    }
  }
  return items;
}
