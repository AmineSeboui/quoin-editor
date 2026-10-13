import { unescapeMarkdown } from '../inline/escapes';
import type { BlockNode, Fence } from './block-tree';
import { CODE_INDENT, isSpaceOrTab, trimBlank, trimBlankEnd } from './lines';
import { addChild, tipOf, type BlockStart, type Continue, type Parser } from './parser-state';
import { takeReferenceDefinitions } from './references';

const ATX_HEADING = /^#{1,6}(?:[ \t]+|$)/;
const MATH_FENCE = /^\$\$[ \t]*$/;
const CLOSING_FENCE = /^(`{3,}|~{3,}|\${2,})[ \t]*$/;
const THEMATIC_BREAK = /^(?:(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|(?:-[ \t]*){3,})$/;
const SETEXT_UNDERLINE = /^(?:=+|-+)[ \t]*$/;

function headingText(raw: string): string {
  const end = trimBlankEnd(raw).length;
  let start = end;
  while (start > 0 && raw[start - 1] === '#') start--;
  const closing = start < end && (start === 0 || isSpaceOrTab(raw[start - 1]));
  return trimBlank(raw.slice(0, closing ? start : end));
}

function openingFence(text: string): { char: string; length: number } | null {
  const char = text[0];
  if (char !== '`' && char !== '~') return null;
  let length = 0;
  while (text[length] === char) length++;
  const hasBacktickInfo = char === '`' && text.includes('`', length);
  return length < 3 || hasBacktickInfo ? null : { char, length };
}

export const isVerbatim = (node: BlockNode): boolean =>
  node.kind === 'code' || node.kind === 'math' || node.kind === 'html';

export const atxHeadingStart: BlockStart = (parser) => {
  const { cursor } = parser;
  const match = cursor.indented ? null : ATX_HEADING.exec(cursor.text);
  if (!match) return 'none';
  const text = headingText(cursor.text.slice(match[0].length));
  addChild(parser, { kind: 'heading', level: match[0].trim().length, text });
  return 'done';
};

export const codeFenceStart: BlockStart = (parser) => {
  const { cursor } = parser;
  const text = cursor.text;
  const opening = cursor.indented ? null : openingFence(text);
  if (!opening) return 'none';
  const fence: Fence = { ...opening, offset: cursor.indent };
  addChild(parser, { kind: 'code', fence, info: unescapeMarkdown(trimBlank(text.slice(opening.length))), lines: [] });
  return 'done';
};

export const mathFenceStart: BlockStart = (parser) => {
  const { cursor } = parser;
  if (cursor.indented || !MATH_FENCE.test(cursor.text)) return 'none';
  addChild(parser, { kind: 'math', fence: { char: '$', length: 2, offset: cursor.indent }, lines: [] });
  return 'done';
};

export const thematicBreakStart: BlockStart = (parser) => {
  const { cursor } = parser;
  if (cursor.indented || !THEMATIC_BREAK.test(cursor.text)) return 'none';
  addChild(parser, { kind: 'break' });
  return 'done';
};

export const setextHeadingStart: BlockStart = (parser, container) => {
  const { cursor } = parser;
  if (container.kind !== 'paragraph' || cursor.indented || !SETEXT_UNDERLINE.test(cursor.text)) return 'none';
  const lines = takeReferenceDefinitions(container.lines, parser.refs);
  container.lines = lines;
  if (lines.length === 0) return 'none';
  container.lines = [];
  addChild(parser, { kind: 'heading', level: cursor.text.startsWith('=') ? 1 : 2, text: trimBlank(lines.join('\n')) });
  return 'done';
};

export const indentedCodeStart: BlockStart = (parser, container) => {
  const { cursor } = parser;
  const tip = tipOf(parser);
  if (!cursor.indented || cursor.blank || tip.kind === 'paragraph' || container.kind === 'table') return 'none';
  cursor.advance(CODE_INDENT, true);
  addChild(parser, { kind: 'code', fence: null, info: '', lines: [] });
  return 'leaf';
};

function closesFence(fence: Fence, text: string): boolean {
  const match = CLOSING_FENCE.exec(text);
  return match !== null && match[1][0] === fence.char && match[1].length >= fence.length;
}

export function continueCode(parser: Parser, fence: Fence | null): Continue {
  const { cursor } = parser;
  if (fence === null) {
    if (cursor.indented) cursor.advance(CODE_INDENT, true);
    else if (cursor.blank) cursor.advanceToNonspace();
    else return 'unmatched';
    return 'matched';
  }
  if (!cursor.indented && closesFence(fence, cursor.text)) {
    parser.stack.pop();
    return 'consumed';
  }
  cursor.advance(Math.min(fence.offset, cursor.indent), true);
  return 'matched';
}
