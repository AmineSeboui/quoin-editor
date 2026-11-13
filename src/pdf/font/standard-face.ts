import type { Face } from './face';
import { standardWidth } from './standard-widths';
import { winAnsiCode } from './win-ansi';

export type StandardName =
  | 'Helvetica'
  | 'Helvetica-Bold'
  | 'Helvetica-Oblique'
  | 'Helvetica-BoldOblique'
  | 'Courier'
  | 'Courier-Bold'
  | 'Courier-Oblique'
  | 'Courier-BoldOblique';

export type StandardFace = Face & { readonly name: StandardName };

/** One of the standard fonts, which draws the Latin characters of WinAnsiEncoding. */
export function standardFace(name: StandardName): StandardFace {
  const family = name.startsWith('Courier') ? 'courier' : 'helvetica';
  const bold = name.includes('Bold');
  return {
    name,
    glyph: winAnsiCode,
    advance: (byte) => standardWidth(family, bold, byte),
    hex: (byte) => byte.toString(16).padStart(2, '0'),
  };
}
