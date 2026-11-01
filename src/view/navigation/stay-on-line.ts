import type { Pos, TextSelection } from '../../engine';
import { textSelection } from '../../engine/state/selection';

export type Glyph = { readonly rect: DOMRect; readonly text: string };
export type GlyphAt = (offset: number) => Glyph | null;

const onLine = (glyph: Glyph | null, y: number): boolean =>
  glyph !== null && glyph.rect.top <= y && y <= glyph.rect.bottom;

/** The glyph before `pos` when a soft wrap falls at `pos` and `y` is on the line that ends there. */
export function wrapsAt(pos: Pos, y: number, glyphAt: GlyphAt): Glyph | null {
  const before = pos.offset > 0 ? glyphAt(pos.offset - 1) : null;
  const after = glyphAt(pos.offset);
  return after !== null && !onLine(after, y) && onLine(before, y) ? before : null;
}

// An offset where a soft wrap falls is both the end of a line and the start of the next. The caret aimed at the line
// at `y` steps back over a trailing space, so text typed there stays on the line, and otherwise leans on the glyph
// before it.
export function stayOnLine(pos: Pos, y: number, glyphAt: GlyphAt): TextSelection {
  const caret = textSelection(pos);
  const before = wrapsAt(pos, y, glyphAt);
  if (before === null) return caret;
  return /\S/.test(before.text) ? { ...caret, assoc: -1 } : textSelection({ ...pos, offset: pos.offset - 1 });
}
