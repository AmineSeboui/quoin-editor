import { flateStream, type ObjectTable } from '../file/object-table';
import { pdfArray, pdfDict, pdfName, pdfRef } from '../file/pdf-syntax';
import type { Face } from './face';
import type { HostFace } from './host-face';
import type { StandardFace } from './standard-face';
import { toUnicodeCMap } from './to-unicode';

const SYMBOLIC = 4;
const FIXED_PITCH = 1;
const ITALIC = 64;

// Each run of glyph ids that follow on from each other is written once, with the widths of its glyphs.
function widthsArray(face: HostFace, scale: number): string {
  const glyphs = [...face.used.keys()].sort((a, b) => a - b);
  const runs: number[][] = [];
  for (const glyph of glyphs) {
    const run = runs[runs.length - 1];
    if (run && run[0] + run.length === glyph) run.push(glyph);
    else runs.push([glyph]);
  }
  const written = runs.map((run) => `${run[0]} ${pdfArray(run.map((glyph) => Math.round(face.font.advance(glyph) * scale)))}`);
  return `[${written.join(' ')}]`;
}

// The whole font is embedded, every glyph of it, keyed by glyph id through Identity-H.
async function embeddedFont(face: HostFace, table: ObjectTable): Promise<number> {
  const { font } = face;
  const scale = 1000 / font.unitsPerEm;
  const name = pdfName(font.name);
  const file = table.add(await flateStream({ Length1: font.bytes.length }, font.bytes));
  const flags = SYMBOLIC | (font.fixedPitch ? FIXED_PITCH : 0) | (font.italicAngle !== 0 ? ITALIC : 0);
  const descriptor = table.add({
    value: pdfDict({
      Type: '/FontDescriptor',
      FontName: name,
      Flags: flags,
      FontBBox: pdfArray(font.bbox.map((value) => Math.round(value * scale))),
      ItalicAngle: font.italicAngle,
      Ascent: Math.round(font.ascent * scale),
      Descent: Math.round(font.descent * scale),
      CapHeight: Math.round(font.capHeight * scale),
      StemV: 80,
      FontFile2: pdfRef(file),
    }),
  });
  const cidFont = table.add({
    value: pdfDict({
      Type: '/Font',
      Subtype: '/CIDFontType2',
      BaseFont: name,
      CIDSystemInfo: pdfDict({ Registry: '(Adobe)', Ordering: '(Identity)', Supplement: 0 }),
      FontDescriptor: pdfRef(descriptor),
      W: widthsArray(face, scale),
      CIDToGIDMap: '/Identity',
    }),
  });
  const toUnicode = table.add(await flateStream({}, new TextEncoder().encode(toUnicodeCMap(face.used))));
  return table.add({
    value: pdfDict({
      Type: '/Font',
      Subtype: '/Type0',
      BaseFont: name,
      Encoding: '/Identity-H',
      DescendantFonts: pdfArray([pdfRef(cidFont)]),
      ToUnicode: pdfRef(toUnicode),
    }),
  });
}

const standardFont = (face: StandardFace, table: ObjectTable) =>
  table.add({ value: pdfDict({ Type: '/Font', Subtype: '/Type1', BaseFont: pdfName(face.name), Encoding: '/WinAnsiEncoding' }) });

/** Writes the objects of a font the pages draw with and returns the number of its font dictionary. */
export async function fontObject(face: Face, table: ObjectTable): Promise<number> {
  return 'font' in face ? embeddedFont(face as HostFace, table) : standardFont(face as StandardFace, table);
}
