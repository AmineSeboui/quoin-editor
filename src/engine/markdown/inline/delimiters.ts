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

function pair(stack: DelimiterItem[], openerAt: number, closerAt: number): number {
  const opener = stack[openerAt];
  const closer = stack[closerAt];
  const used = closer.char === '~' ? closer.count : Math.min(2, opener.count, closer.count);
  const range = { mark: emphasisMark(closer.char, used) };
  opener.count -= used;
  closer.count -= used;
  opener.opens.unshift(range);
  closer.closes.push(range);
  stack.splice(openerAt + 1, closerAt - openerAt - 1);
  let closerIndex = openerAt + 1;
  if (opener.count === 0) {
    stack.splice(openerAt, 1);
    closerIndex = openerAt;
  }
  if (closer.count === 0) stack.splice(closerIndex, 1);
  return closerIndex;
}

export function processEmphasis(stack: DelimiterItem[], bottom: number): void {
  const openersBottom = new Map<string, DelimiterItem | undefined>();
  let index = bottom;
  while (index < stack.length) {
    const closer = stack[index];
    if (!closer.canClose) {
      index++;
      continue;
    }
    const key = `${closer.char}${closer.canOpen}${closer.length % 3}`;
    const floor = openersBottom.get(key);
    let at = index - 1;
    while (at >= bottom && stack[at] !== floor && !canPair(stack[at], closer)) at--;
    if (at >= bottom && stack[at] !== floor) {
      index = pair(stack, at, index);
    } else {
      openersBottom.set(key, stack[index - 1]);
      if (closer.canOpen) index++;
      else stack.splice(index, 1);
    }
  }
  stack.length = bottom;
}
