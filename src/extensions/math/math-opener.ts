import { dollarRunEnd, findMathClose, opensMath } from '../../engine/markdown/inline/math-span';

// An odd run of backslashes before a dollar escapes it, as the parser reads a backslash and the character after it.
export function escaped(src: string, at: number): boolean {
  let backslashes = 0;
  while (src[at - 1 - backslashes] === '\\') backslashes++;
  return backslashes % 2 === 1;
}

/** Whether the text holds a dollar the markdown parser would read as opening a formula, and no dollar closes it yet. */
export function opensUnclosedMath(src: string): boolean {
  for (let pos = src.indexOf('$'); pos >= 0; pos = src.indexOf('$', pos)) {
    if (src[pos + 1] === '$') pos = dollarRunEnd(src, pos);
    else if (escaped(src, pos) || !opensMath(src, pos)) pos++;
    else {
      const close = findMathClose(src, pos + 2);
      if (close < 0) return true;
      pos = close + 1;
    }
  }
  return false;
}
