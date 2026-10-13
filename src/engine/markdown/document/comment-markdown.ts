const DOUBLE_HYPHEN = /--/g;
const LINE_SEPARATOR = /[\u2028\u2029]/g;

// A comment ends at the first double hyphen followed by an angle bracket, and the block reader matches the payload
// with a pattern that stops at a line separator, so both are written as JSON escapes that JSON.parse restores.
export function quoinComment(type: string, data: Record<string, unknown>, indent: number): string {
  const payload = JSON.stringify(indent > 0 ? { data, indent } : { data })
    .replace(DOUBLE_HYPHEN, '-\\u002d')
    .replace(LINE_SEPARATOR, (char) => `\\u${char.charCodeAt(0).toString(16)}`);
  return `<!-- quoin:${type} ${payload} -->`;
}
