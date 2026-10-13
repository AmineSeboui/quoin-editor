import { addChild, canNest, closeTip, type BlockStart, type Parser } from './parser-state';

const DETAILS_OPEN = /^<details(\s[^>]*)?>/i;
const DETAILS_CLOSE = /^<\/details>[ \t]*$/i;
const SUMMARY_OPEN = /^<summary(?:\s[^>]*)?>/i;
// Quoin ends every summary line but the last with a hard-break backslash and closes the last with the tag, so a tag
// inside the text never ends a line that way. Foreign html may close the summary in the middle of a line.
const SUMMARY_CLOSE = /<\/summary>(?:[ \t]*$|(?![\s\S]*\\$))/i;
const OPEN_ATTRIBUTE = /(?:^|\s)open(?=[\s=/]|$)/i;

export function findOpenDetails(parser: Parser, limit: number): number {
  const { cursor, stack } = parser;
  if (cursor.indented || !DETAILS_CLOSE.test(cursor.text)) return -1;
  for (let at = limit - 1; at > 0; at--) if (stack[at].kind === 'details') return at;
  return -1;
}

export const detailsStart: BlockStart = (parser) => {
  const { cursor } = parser;
  const match = cursor.indented || !canNest(parser) ? null : DETAILS_OPEN.exec(cursor.text);
  if (!match) return 'none';
  cursor.advanceToNonspace();
  cursor.advance(match[0].length);
  addChild(parser, { kind: 'details', open: OPEN_ATTRIBUTE.test(match[1] ?? ''), summary: null, children: [] });
  return 'container';
};

export const summaryStart: BlockStart = (parser, container) => {
  const { cursor } = parser;
  const fresh = container.kind === 'details' && container.summary === null && container.children.length === 0;
  if (!fresh || cursor.indented || !SUMMARY_OPEN.test(cursor.text)) return 'none';
  addChild(parser, { kind: 'html', ends: SUMMARY_CLOSE, lines: [], summaryOf: container });
  return 'leaf';
};

export const detailsEnd: BlockStart = (parser) => {
  const at = findOpenDetails(parser, parser.matched);
  if (at < 0) return 'none';
  while (parser.stack.length > at) closeTip(parser);
  parser.matched = parser.stack.length;
  return 'done';
};
