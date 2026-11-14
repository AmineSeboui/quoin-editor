import type { PdfObject } from '../file/pdf-file';
import { pdfArray, pdfDict, pdfLiteral } from '../file/pdf-syntax';
import type { LinkArea } from '../paint/page-canvas';

const percentEncoded = (char: string) =>
  [...new TextEncoder().encode(char)].map((byte) => `%${byte.toString(16).toUpperCase().padStart(2, '0')}`).join('');

// An address in a PDF is a string of ASCII, so any other character is written percent-encoded as UTF-8.
const asciiUri = (uri: string) => uri.replace(/[^!-~]/gu, percentEncoded);

/**
 * A link annotation over an area, to its address or to the destination of its heading; null for a heading the
 * document has no destination for.
 */
export function linkObject({ rect, target }: LinkArea, destination: (heading: string) => string | undefined): PdfObject | null {
  const base = { Type: '/Annot', Subtype: '/Link', Rect: pdfArray(rect), Border: pdfArray([0, 0, 0]) };
  if ('uri' in target) return { value: pdfDict({ ...base, A: pdfDict({ S: '/URI', URI: pdfLiteral(asciiUri(target.uri)) }) }) };
  const dest = destination(target.heading);
  return dest === undefined ? null : { value: pdfDict({ ...base, Dest: dest }) };
}
