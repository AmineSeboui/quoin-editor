import type { TextRun } from './text-runs';

const NEVER = '(?!)';

// An anchor is a `^` or `$` outside a character class and not escaped: inside a class one is literal or a negation.
function anchored(source: string, start: boolean, end: boolean): string {
  let out = '';
  let inClass = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '\\') {
      out += source.slice(i, i + 2);
      i++;
    } else if (inClass) {
      inClass = char !== ']';
      out += char;
    } else {
      inClass = char === '[';
      out += (char === '^' && !start) || (char === '$' && !end) ? NEVER : char;
    }
  }
  return out;
}

/**
 * The pattern each run of a region is searched with. A run is searched alone, so that no match takes in an atom, which
 * would let `^` and `$` hold where an atom ends the run; they hold only at the start and the end of the region.
 */
export function runPattern(pattern: RegExp): (run: TextRun, regionLength: number) => RegExp {
  const variants: Record<string, RegExp> = {};
  return ({ start, text }, regionLength) => {
    const atStart = start === 0;
    const atEnd = start + text.length === regionLength;
    return (variants[`${atStart} ${atEnd}`] ??= new RegExp(anchored(pattern.source, atStart, atEnd), pattern.flags));
  };
}
