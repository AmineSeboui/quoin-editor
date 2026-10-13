import { classifyDelimiterRun } from './delimiters';
import type { DelimiterChar } from './inline-items';

const CANDIDATES: Readonly<Record<'bold' | 'italic' | 'strike', readonly string[]>> = {
  bold: ['**', '__'],
  italic: ['_', '*'],
  strike: ['~~'],
};

function firstCodePoint(value: string): string {
  const code = value.codePointAt(0);
  return code === undefined ? '' : String.fromCodePoint(code);
}

function lastCodePoint(value: string): string {
  return Array.from(value.slice(-2)).pop() ?? '';
}

function endsWithDelimiter(value: string, char: string): boolean {
  if (!value.endsWith(char)) return false;
  let slashes = 0;
  for (let at = value.length - 2; at >= 0 && value[at] === '\\'; at--) slashes++;
  return slashes % 2 === 0;
}

// A delimiter that touches a delimiter of the same character would fuse with it into one longer run.
function fuses(char: string, before: string, inner: string): boolean {
  return endsWithDelimiter(before, char) || inner.startsWith(char) || endsWithDelimiter(inner, char);
}

export function chooseDelimiter(
  type: 'bold' | 'italic' | 'strike',
  before: string,
  inner: string,
  after: string,
): string | null {
  const previous = lastCodePoint(before);
  const first = firstCodePoint(inner);
  const last = lastCodePoint(inner);
  const following = firstCodePoint(after);
  const chosen = CANDIDATES[type].find((delimiter) => {
    const char = delimiter[0] as DelimiterChar;
    if (fuses(char, before, inner)) return false;
    return classifyDelimiterRun(previous, first, char).canOpen && classifyDelimiterRun(last, following, char).canClose;
  });
  return chosen ?? null;
}
