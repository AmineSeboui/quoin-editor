// The characters of WinAnsiEncoding from 128 to 159, a zero where the encoding has none.
const HIGH =
  '\u20AC\0\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\0\u017D\0' +
  '\0\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\0\u017E\u0178';

/** The byte that draws `codePoint` in a standard font under WinAnsiEncoding, or undefined where it has none. */
export function winAnsiCode(codePoint: number): number | undefined {
  if ((codePoint >= 0x20 && codePoint <= 0x7e) || (codePoint >= 0xa0 && codePoint <= 0xff)) return codePoint;
  const at = codePoint === 0 ? -1 : HIGH.indexOf(String.fromCharCode(codePoint));
  return at < 0 || codePoint > 0xffff ? undefined : 0x80 + at;
}
