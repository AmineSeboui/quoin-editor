import type { Face } from './face';
import type { TrueType } from './truetype';

/** A TrueType face the host supplied, which records each glyph it draws and the character it stands for. */
export type HostFace = Face & { readonly font: TrueType; readonly used: ReadonlyMap<number, number> };

export function hostFace(font: TrueType): HostFace {
  const used = new Map<number, number>();
  const glyphs = new Map<number, number>();
  return {
    font,
    used,
    glyph(codePoint) {
      let glyph = glyphs.get(codePoint);
      if (glyph === undefined) glyphs.set(codePoint, (glyph = font.glyphOf(codePoint)));
      if (glyph === 0) return undefined;
      if (!used.has(glyph)) used.set(glyph, codePoint);
      return glyph;
    },
    advance: (glyph) => (font.advance(glyph) * 1000) / font.unitsPerEm,
    hex: (glyph) => glyph.toString(16).padStart(4, '0'),
  };
}
