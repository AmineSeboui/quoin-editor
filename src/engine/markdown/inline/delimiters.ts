import type { Mark } from '../../model/types';
import type { DelimiterChar, DelimiterItem } from './inline-items';

const WHITESPACE = /^[\p{Zs}\t\n\f\r]$/u;
const PUNCTUATION = /^[\p{P}\p{S}]$/u;

function isWhitespace(char: string): boolean {
  return char === '' || WHITESPACE.test(char);
}

export function classifyDelimiterRun(
  before: string,
  after: string,
  char: DelimiterChar,
): { canOpen: boolean; canClose: boolean } {
  const punctuationBefore = PUNCTUATION.test(before);
  const punctuationAfter = PUNCTUATION.test(after);
  const leftFlanking = !isWhitespace(after) && (!punctuationAfter || isWhitespace(before) || punctuationBefore);
  const rightFlanking = !isWhitespace(before) && (!punctuationBefore || isWhitespace(after) || punctuationAfter);
  if (char !== '_') return { canOpen: leftFlanking, canClose: rightFlanking };
  return {
    canOpen: leftFlanking && (!rightFlanking || punctuationBefore),
    canClose: rightFlanking && (!leftFlanking || punctuationAfter),
  };
}

function canPair(opener: DelimiterItem, closer: DelimiterItem): boolean {
  if (opener.char !== closer.char || !opener.canOpen) return false;
  if (closer.char === '~') return opener.length === closer.length;
  if (!opener.canClose && !closer.canOpen) return true;
  const bothMultiplesOfThree = opener.length % 3 === 0 && closer.length % 3 === 0;
  return (opener.length + closer.length) % 3 !== 0 || bothMultiplesOfThree;
}

function emphasisMark(char: DelimiterChar, used: number): Mark {
  if (char === '~') return { type: 'strike' };
  return { type: used === 2 ? 'bold' : 'italic' };
}

function pair(opener: DelimiterItem, closer: DelimiterItem): void {
  const used = closer.char === '~' ? closer.count : Math.min(2, opener.count, closer.count);
  const range = { mark: emphasisMark(closer.char, used) };
  opener.count -= used;
  closer.count -= used;
  opener.opens.push(range);
  closer.closes.push(range);
}

// A floor is the index of the highest opener that no closer of its key can pair with. An opener at or below it was
// already refused, so a floor above a cut stack drops to the new top and the same openers stay refused.
function clampFloors(floors: Map<string, number>, length: number): void {
  for (const [key, floor] of floors) if (floor >= length) floors.set(key, length - 1);
}

export function processEmphasis(stack: DelimiterItem[], bottom: number): void {
  const openers: DelimiterItem[] = [];
  const floors = new Map<string, number>();
  let index = bottom;
  while (index < stack.length) {
    const closer = stack[index];
    if (!closer.canClose) {
      openers.push(closer);
      index++;
      continue;
    }
    const key = `${closer.char}${closer.canOpen}${closer.length % 3}`;
    const floor = floors.get(key) ?? -1;
    let at = openers.length - 1;
    while (at > floor && !canPair(openers[at], closer)) at--;
    if (at > floor) {
      const opener = openers[at];
      pair(opener, closer);
      openers.length = opener.count > 0 ? at + 1 : at;
      clampFloors(floors, openers.length);
      if (closer.count === 0) index++;
    } else {
      floors.set(key, openers.length - 1);
      if (closer.canOpen) openers.push(closer);
      index++;
    }
  }
  stack.length = bottom;
}
