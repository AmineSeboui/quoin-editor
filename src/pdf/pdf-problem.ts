/** A face of the `fonts` option. */
export type PdfFontRole = 'regular' | 'bold' | 'italic' | 'mono';

/**
 * Something the PDF export could not draw as the document holds it, reported through `onProblem` while the export
 * goes on: characters no font draws, which are drawn as empty boxes; a picture that could not be read or is of a
 * format a PDF cannot hold, which is replaced by its alt text; a font that could not be embedded, which is left out.
 */
export type PdfProblem =
  | { readonly type: 'glyphs'; readonly blockId: string; readonly characters: string }
  | { readonly type: 'image'; readonly blockId: string; readonly url: string; readonly reason: 'unavailable' | 'format' }
  | { readonly type: 'font'; readonly role: PdfFontRole; readonly reason: 'format' | 'restricted' };
