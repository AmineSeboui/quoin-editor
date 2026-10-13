import type { HtmlNode } from './block-tree';
import { findOpenDetails } from './details-blocks';
import { parseQuoinComment } from './quoin-comment';
import { addChild, tipOf, type BlockStart, type Continue, type Parser } from './parser-state';

const BLOCK_TAGS =
  'address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|' +
  'fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|' +
  'menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|' +
  'track|ul';
const TAG_NAME = '[A-Za-z][A-Za-z0-9-]*';
const ATTRIBUTE = `\\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\\s*=\\s*(?:[^"'=<>\`\\x00-\\x20]+|'[^']*'|"[^"]*"))?`;
const COMPLETE_TAG = new RegExp(`^(?:<${TAG_NAME}(?:${ATTRIBUTE})*\\s*/?>|</${TAG_NAME}\\s*>)\\s*$`);

type HtmlKind = { start: RegExp; end: RegExp | null; interrupts: boolean };

const HTML_KINDS: readonly HtmlKind[] = [
  { start: /^<(?:script|pre|textarea|style)(?:\s|>|$)/i, end: /<\/(?:script|pre|textarea|style)>/i, interrupts: true },
  { start: /^<!--/, end: /-->/, interrupts: true },
  { start: /^<\?/, end: /\?>/, interrupts: true },
  { start: /^<![A-Za-z]/, end: />/, interrupts: true },
  { start: /^<!\[CDATA\[/, end: /\]\]>/, interrupts: true },
  { start: new RegExp(`^</?(?:${BLOCK_TAGS})(?:\\s|/?>|$)`, 'i'), end: null, interrupts: true },
  { start: COMPLETE_TAG, end: null, interrupts: false },
];

export const startsHtmlBlock = (line: string): boolean => HTML_KINDS.some(({ start }) => start.test(line));

export const htmlBlockStart: BlockStart = (parser, container) => {
  const { cursor } = parser;
  if (cursor.indented || !cursor.text.startsWith('<')) return 'none';
  const text = cursor.text;
  const lazy = parser.matched < parser.stack.length && !cursor.blank && tipOf(parser).kind === 'paragraph';
  const canStandAlone = container.kind !== 'paragraph' && !lazy;
  const kind = HTML_KINDS.find(({ start, interrupts }) => start.test(text) && (interrupts || canStandAlone));
  if (!kind) return 'none';
  addChild(parser, { kind: 'html', ends: kind.end, lines: [] });
  return 'leaf';
};

export const quoinCommentStart: BlockStart = (parser) => {
  const { cursor } = parser;
  const comment = cursor.indented ? null : parseQuoinComment(cursor.text);
  if (!comment) return 'none';
  addChild(parser, { kind: 'quoin', ...comment });
  return 'done';
};

export function continueHtml(parser: Parser, node: HtmlNode, index: number): Continue {
  if (node.ends !== null && !node.summaryOf) return 'matched';
  if (parser.cursor.blank) return 'unmatched';
  return node.ends === null && findOpenDetails(parser, index) >= 0 ? 'unmatched' : 'matched';
}
