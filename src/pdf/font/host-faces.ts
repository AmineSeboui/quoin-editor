import type { PdfFontRole, PdfProblem } from '../pdf-problem';
import type { HostFaces } from './font-set';
import { hostFace } from './host-face';
import { readTrueType } from './truetype';

export type PdfFontData = Uint8Array | ArrayBuffer;

/** TrueType files the export embeds, each optional: text falls back to the standard fonts for what they lack. */
export type PdfFonts = { readonly [role in PdfFontRole]?: PdfFontData };

const ROLES: readonly PdfFontRole[] = ['regular', 'bold', 'italic', 'mono'];

/** The faces of the fonts the host supplied, each one that cannot be embedded reported and left out. */
export function hostFaces(fonts: PdfFonts | undefined, report: (problem: PdfProblem) => void): HostFaces {
  const faces: { -readonly [role in PdfFontRole]?: ReturnType<typeof hostFace> } = {};
  for (const role of ROLES) {
    const data = fonts?.[role];
    if (!data) continue;
    const font = readTrueType(data instanceof Uint8Array ? data : new Uint8Array(data));
    if (typeof font === 'string') report({ type: 'font', role, reason: font });
    else faces[role] = hostFace(font);
  }
  return faces;
}
