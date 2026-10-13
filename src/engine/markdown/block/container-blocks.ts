import type { ItemNode, ListMarker } from './block-tree';
import { isSpaceOrTab, trimBlank, type Cursor } from './lines';
import {
  addChild,
  canNest,
  closeUnmatched,
  tipOf,
  type BlockStart,
  type Continue,
  type Parser,
} from './parser-state';

const BULLET = /^[*+-]/;
const ORDERED = /^(\d{1,9})([.)])/;
const MAX_MARKER_SPACES = 5;

function consumeQuoteMarker(cursor: Cursor): void {
  cursor.advanceToNonspace();
  cursor.advance(1);
  if (isSpaceOrTab(cursor.next)) cursor.advance(1, true);
}

export const quoteStart: BlockStart = (parser) => {
  const { cursor } = parser;
  if (cursor.indented || !cursor.text.startsWith('>') || !canNest(parser)) return 'none';
  consumeQuoteMarker(cursor);
  addChild(parser, { kind: 'quote', children: [] });
  return 'container';
};

export function continueQuote(parser: Parser): Continue {
  const { cursor } = parser;
  if (cursor.indented || !cursor.text.startsWith('>')) return 'unmatched';
  consumeQuoteMarker(cursor);
  return 'matched';
}

export function continueItem(parser: Parser, item: ItemNode): Continue {
  const { cursor } = parser;
  if (cursor.blank) {
    if (item.children.length === 0) return 'unmatched';
    cursor.advanceToNonspace();
  } else if (cursor.indent >= item.contentOffset) {
    cursor.advance(item.contentOffset, true);
  } else {
    return 'unmatched';
  }
  return 'matched';
}

const sameList = (a: ListMarker, b: ListMarker): boolean => a.ordered === b.ordered && a.char === b.char;

function readMarker(text: string, interrupting: boolean): { marker: ListMarker; width: number } | null {
  const bullet = BULLET.exec(text);
  if (bullet) return { marker: { ordered: false, char: bullet[0], number: 0 }, width: 1 };
  const ordered = ORDERED.exec(text);
  if (!ordered || (interrupting && Number(ordered[1]) !== 1)) return null;
  return { marker: { ordered: true, char: ordered[2], number: Number(ordered[1]) }, width: ordered[0].length };
}

// Returns the item padding: the marker width plus the spaces after it, or plus one space when the item starts
// with a blank or its first line is indented as code.
function consumeMarkerSpacing(cursor: Cursor, width: number): number {
  const afterMarker = cursor.mark();
  const startColumn = cursor.column;
  do cursor.advance(1, true);
  while (cursor.column - startColumn < MAX_MARKER_SPACES && isSpaceOrTab(cursor.next));
  const spaces = cursor.column - startColumn;
  if (spaces >= MAX_MARKER_SPACES || spaces < 1 || cursor.offset >= cursor.line.length) {
    cursor.restore(afterMarker);
    if (isSpaceOrTab(cursor.next)) cursor.advance(1, true);
    return width + 1;
  }
  return width + spaces;
}

export const itemStart: BlockStart = (parser, container) => {
  const { cursor } = parser;
  if (cursor.indented || !canNest(parser)) return 'none';
  const interrupting = container.kind === 'paragraph';
  const text = cursor.text;
  const read = readMarker(text, interrupting);
  if (!read) return 'none';
  const next = text[read.width];
  if (next !== undefined && !isSpaceOrTab(next)) return 'none';
  if (interrupting && trimBlank(text.slice(read.width)) === '') return 'none';
  const markerOffset = cursor.indent;
  cursor.advanceToNonspace();
  cursor.advance(read.width, true);
  const contentOffset = markerOffset + consumeMarkerSpacing(cursor, read.width);
  closeUnmatched(parser);
  const list = tipOf(parser);
  if (list.kind !== 'list' || !sameList(list.marker, read.marker)) {
    addChild(parser, { kind: 'list', marker: read.marker, children: [] });
  }
  addChild(parser, { kind: 'item', marker: read.marker, contentOffset, children: [] });
  return 'container';
};
