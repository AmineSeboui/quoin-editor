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

export function processEmphasis(stack: DelimiterItem[], bottom: number): void {
  const openers: DelimiterItem[] = [];
  const openersBottom = new Map<string, DelimiterItem | undefined>();
  let index = bottom;
  while (index < stack.length) {
    const closer = stack[index];
    if (!closer.canClose) {
      openers.push(closer);
      index++;
      continue;
    }
    const key = `${closer.char}${closer.canOpen}${closer.length % 3}`;
    const floor = openersBottom.get(key);
    let at = openers.length - 1;
    while (at >= 0 && openers[at] !== floor && !canPair(openers[at], closer)) at--;
    if (at >= 0 && openers[at] !== floor) {
      const opener = openers[at];
      pair(opener, closer);
      openers.length = opener.count > 0 ? at + 1 : at;
      if (closer.count === 0) index++;
    } else {
      openersBottom.set(key, openers.at(-1));
      if (closer.canOpen) openers.push(closer);
      index++;
    }
  }
  stack.length = bottom;
}
