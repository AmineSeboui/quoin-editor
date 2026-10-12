import type { Inline } from '../../model/types';
import type { ParseInlineOptions } from '../../schema/types';
import { closeBracket } from './close-bracket';
import { codeSpanText, findCodeClose } from './code-span';
import { classifyDelimiterRun, processEmphasis } from './delimiters';
import { matchEntity } from './entities';
import { isEscapable } from './escapes';
import { flattenItems, type DelimiterChar, type DelimiterItem } from './inline-items';
import { matchAt } from './match-at';
import { findMathClose, mathLatex, opensMath } from './math-span';
import { openAngle } from './open-angle';
import { pairTags } from './pair-tags';
import { createScanner, findClose, pushText, type Scanner } from './scanner';

const PLAIN = /[^\\`*_~[\]!<&$\n]+/y;
const CODE = { type: 'code' };

function breakLine(scanner: Scanner, value: string): void {
  scanner.items.push({ kind: 'text', text: value });
  let next = scanner.pos + 1;
  while (scanner.src[next] === ' ' || scanner.src[next] === '\t') next++;
  scanner.pos = next;
}

function plainRun(scanner: Scanner, run: string): void {
  if (scanner.src[scanner.pos + run.length] !== '\n') {
    pushText(scanner, run, run.length);
    return;
  }
  pushText(scanner, run.replace(/[ \t]+$/, ''), run.length);
  breakLine(scanner, run.endsWith('  ') ? '\n' : scanner.softBreak);
}

function backslash(scanner: Scanner): void {
  const next = scanner.src[scanner.pos + 1];
  if (next === '\n') {
    scanner.pos += 1;
    breakLine(scanner, '\n');
  } else if (isEscapable(next)) {
    pushText(scanner, next, 2);
  } else {
    pushText(scanner, '\\', 1);
  }
}

function runLength(src: string, pos: number, char: string): number {
  let end = pos;
  while (src[end] === char) end++;
  return end - pos;
}

function codeSpan(scanner: Scanner): void {
  const { src, pos } = scanner;
  const fence = runLength(src, pos, '`');
  const close = findClose(scanner, `code${fence}`, pos + fence, (from) => findCodeClose(src, from, fence));
  if (close < 0) {
    pushText(scanner, '`'.repeat(fence), fence);
    return;
  }
  scanner.items.push({ kind: 'text', text: codeSpanText(src.slice(pos + fence, close)), marks: [CODE] });
  scanner.pos = close + fence;
}

function codePointBefore(src: string, pos: number): string {
  return Array.from(src.slice(Math.max(0, pos - 2), pos)).pop() ?? '';
}

function codePointAt(src: string, pos: number): string {
  const code = src.codePointAt(pos);
  return code === undefined ? '' : String.fromCodePoint(code);
}

function delimiterRun(scanner: Scanner, char: DelimiterChar): void {
  const { src, pos } = scanner;
  const length = runLength(src, pos, char);
  const end = pos + length;
  if (char === '~' && length > 2) {
    pushText(scanner, src.slice(pos, end), length);
    return;
  }
  const flanking = classifyDelimiterRun(codePointBefore(src, pos), codePointAt(src, end), char);
  const delimiter: DelimiterItem = {
    kind: 'delimiter',
    char,
    length,
    count: length,
    ...flanking,
    opens: [],
    closes: [],
  };
  scanner.items.push(delimiter);
  if (delimiter.canOpen || delimiter.canClose) scanner.delimiters.push(delimiter);
  scanner.pos = end;
}

function openBracket(scanner: Scanner, image: boolean): void {
  const width = image ? 2 : 1;
  const { items, pos, delimiters } = scanner;
  scanner.brackets.push({ index: items.length, start: pos + width, image, bottom: delimiters.length, active: true });
  pushText(scanner, image ? '![' : '[', width);
}

function entity(scanner: Scanner): void {
  const decoded = matchEntity(scanner.src, scanner.pos);
  if (decoded) pushText(scanner, decoded.value, decoded.end - scanner.pos);
  else pushText(scanner, '&', 1);
}

function math(scanner: Scanner): void {
  const { src, pos } = scanner;
  const close = opensMath(src, pos) ? findClose(scanner, 'math', pos + 2, (from) => findMathClose(src, from)) : -1;
  if (close < 0) {
    pushText(scanner, '$', 1);
    return;
  }
  scanner.items.push({ kind: 'atom', type: 'math', attrs: { latex: mathLatex(src, pos, close) } });
  scanner.pos = close + 1;
}

function scanSpecial(scanner: Scanner, char: string): void {
  if (char === '\\') backslash(scanner);
  else if (char === '`') codeSpan(scanner);
  else if (char === '*' || char === '_' || char === '~') delimiterRun(scanner, char);
  else if (char === '[') openBracket(scanner, false);
  else if (char === '!' && scanner.src[scanner.pos + 1] === '[') openBracket(scanner, true);
  else if (char === ']') closeBracket(scanner);
  else if (char === '<') openAngle(scanner);
  else if (char === '&') entity(scanner);
  else if (char === '$') math(scanner);
  else if (char === '\n') breakLine(scanner, scanner.softBreak);
  else pushText(scanner, char, 1);
}

export function parseInline(markdown: string, options: ParseInlineOptions = {}): Inline {
  const scanner = createScanner(markdown, options);
  while (scanner.pos < markdown.length) {
    const plain = matchAt(PLAIN, markdown, scanner.pos);
    if (plain) plainRun(scanner, plain[0]);
    else scanSpecial(scanner, markdown[scanner.pos]);
  }
  processEmphasis(scanner.delimiters, 0);
  pairTags(scanner.items);
  return flattenItems(scanner.items);
}
