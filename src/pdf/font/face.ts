/** A font the export draws with: a standard one every reader carries, or a TrueType font the host supplies. */
export type Face = {
  /** The glyph that draws `codePoint`, or undefined where the font has none. */
  glyph(codePoint: number): number | undefined;
  /** The advance of a glyph, in thousandths of the font size. */
  advance(glyph: number): number;
  /** The hex digits of the bytes that show a glyph. */
  hex(glyph: number): string;
};

/** A face and the styles the export fakes for it, where the host supplied no face of that style. */
export type FaceUse = { readonly face: Face; readonly fakeBold: boolean; readonly fakeItalic: boolean };
