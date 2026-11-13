import { characterMap } from './truetype-cmap';

/** A TrueType font as the export embeds it, its metrics in font units. */
export type TrueType = {
  readonly bytes: Uint8Array;
  readonly name: string;
  readonly unitsPerEm: number;
  readonly ascent: number;
  readonly descent: number;
  readonly capHeight: number;
  readonly bbox: readonly [number, number, number, number];
  readonly italicAngle: number;
  readonly fixedPitch: boolean;
  advance(glyph: number): number;
  /** The glyph of a code point, 0 where the font has none. */
  glyphOf(codePoint: number): number;
};

/** Why a font cannot be embedded: it is no TrueType font, or its licence forbids embedding it. */
export type TrueTypeRefusal = 'format' | 'restricted';

const TRUETYPE = [0x00010000, 0x74727565];
const REQUIRED = ['head', 'hhea', 'hmtx', 'maxp', 'cmap', 'glyf', 'loca'];
const RESTRICTED_LICENCE = 0x0002;
const BITMAPS_ONLY = 0x0200;

function tablesOf(view: DataView): Map<string, number> | null {
  if (!TRUETYPE.includes(view.getUint32(0))) return null;
  const tables = new Map<string, number>();
  for (let index = 0; index < view.getUint16(4); index++) {
    const record = 12 + index * 16;
    const tag = String.fromCharCode(...[0, 1, 2, 3].map((at) => view.getUint8(record + at)));
    const [offset, length] = [view.getUint32(record + 8), view.getUint32(record + 12)];
    if (offset + length > view.byteLength) return null;
    tables.set(tag, offset);
  }
  return REQUIRED.every((tag) => tables.has(tag)) ? tables : null;
}

// A table read at layout time may point past the end of a malformed file: what it cannot read counts as no glyph.
const orZero = (read: () => number) => {
  try {
    return read();
  } catch {
    return 0;
  }
};

const NAME_CHARACTER = /[!-~]/;
const DELIMITER = /[()<>[\]{}/%]/;

function postScriptName(view: DataView, at: number | undefined): string {
  if (at === undefined) return '';
  const strings = at + view.getUint16(at + 4);
  for (let index = 0; index < view.getUint16(at + 2); index++) {
    const record = at + 6 + index * 12;
    const [platform, nameId, length, offset] = [0, 6, 8, 10].map((field) => view.getUint16(record + field));
    if (nameId !== 6 || (platform !== 1 && platform !== 3)) continue;
    const wide = platform === 3 ? 2 : 1;
    const codes = Array.from({ length: length / wide }, (_, char) =>
      wide === 2 ? view.getUint16(strings + offset + char * 2) : view.getUint8(strings + offset + char),
    );
    return String.fromCharCode(...codes)
      .split('')
      .filter((char) => NAME_CHARACTER.test(char) && !DELIMITER.test(char))
      .join('');
  }
  return '';
}

function parse(bytes: Uint8Array): TrueType | TrueTypeRefusal {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tables = tablesOf(view);
  if (!tables) return 'format';
  const [head, hhea, hmtx, os2, post] = ['head', 'hhea', 'hmtx', 'OS/2', 'post'].map((tag) => tables.get(tag));
  const glyphOf = characterMap(view, tables.get('cmap')!);
  const unitsPerEm = view.getUint16(head! + 18);
  if (!glyphOf || unitsPerEm < 16) return 'format';
  const fsType = os2 === undefined ? 0 : view.getUint16(os2 + 8);
  if ((fsType & 0xf) === RESTRICTED_LICENCE || fsType & BITMAPS_ONLY) return 'restricted';
  const typo = os2 !== undefined && view.getUint16(os2) >= 1;
  const ascent = view.getInt16(typo ? os2! + 68 : hhea! + 4);
  const metrics = view.getUint16(hhea! + 34);
  const glyphs = view.getUint16(tables.get('maxp')! + 4);
  return {
    bytes,
    name: postScriptName(view, tables.get('name')) || 'Font',
    unitsPerEm,
    ascent,
    descent: view.getInt16(typo ? os2! + 70 : hhea! + 6),
    capHeight: os2 !== undefined && view.getUint16(os2) >= 2 ? view.getInt16(os2 + 88) : ascent,
    bbox: [36, 38, 40, 42].map((field) => view.getInt16(head! + field)) as [number, number, number, number],
    italicAngle: post === undefined ? 0 : view.getInt32(post + 4) / 65536,
    fixedPitch: post !== undefined && view.getUint32(post + 12) !== 0,
    advance: (glyph) => (glyph < glyphs ? orZero(() => view.getUint16(hmtx! + Math.min(glyph, metrics - 1) * 4)) : 0),
    glyphOf: (codePoint) => {
      const glyph = orZero(() => glyphOf(codePoint));
      return glyph < glyphs ? glyph : 0;
    },
  };
}

/** The font in `bytes` when it is a TrueType font the export can embed, else why it cannot. */
export function readTrueType(bytes: Uint8Array): TrueType | TrueTypeRefusal {
  try {
    return parse(bytes);
  } catch {
    return 'format';
  }
}
