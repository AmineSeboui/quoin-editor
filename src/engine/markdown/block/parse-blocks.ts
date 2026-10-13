import type { LinkTarget } from '../inline/link-syntax';
import type { BlockNode, DocumentNode } from './block-tree';
import { continueItem, continueQuote, itemStart, quoteStart } from './container-blocks';
import { detailsEnd, detailsStart, summaryStart } from './details-blocks';
import { continueHtml, htmlBlockStart, quoinCommentStart } from './html-blocks';
import {
  atxHeadingStart,
  codeFenceStart,
  continueCode,
  indentedCodeStart,
  isVerbatim,
  mathFenceStart,
  setextHeadingStart,
  thematicBreakStart,
} from './leaf-blocks';
import { splitLines, trimBlankStart } from './lines';
import {
  addChild,
  closeTip,
  closeUnmatched,
  createParser,
  tipOf,
  type BlockStart,
  type Continue,
  type Parser,
  type StartResult,
} from './parser-state';
import { addTableRow, tableStart } from './tables';

export type ParsedBlocks = { document: DocumentNode; refs: ReadonlyMap<string, LinkTarget> };

const STARTS: readonly BlockStart[] = [
  quoteStart,
  atxHeadingStart,
  codeFenceStart,
  mathFenceStart,
  quoinCommentStart,
  summaryStart,
  detailsEnd,
  detailsStart,
  htmlBlockStart,
  tableStart,
  setextHeadingStart,
  thematicBreakStart,
  itemStart,
  indentedCodeStart,
];

function continueBlock(parser: Parser, node: BlockNode, index: number): Continue {
  switch (node.kind) {
    case 'quote':
      return continueQuote(parser);
    case 'item':
      return continueItem(parser, node);
    case 'list':
    case 'details':
      return 'matched';
    case 'code':
    case 'math':
      return continueCode(parser, node.fence);
    case 'html':
      return continueHtml(parser, node, index);
    case 'paragraph':
    case 'table':
      return parser.cursor.blank ? 'unmatched' : 'matched';
    default:
      return 'unmatched';
  }
}

function matchOpenBlocks(parser: Parser): boolean {
  let matched = 1;
  while (matched < parser.stack.length) {
    const outcome = continueBlock(parser, parser.stack[matched], matched);
    if (outcome === 'consumed') return false;
    if (outcome === 'unmatched') break;
    matched++;
  }
  parser.matched = matched;
  return true;
}

function openNewBlocks(parser: Parser): boolean {
  let container = parser.stack[parser.matched - 1];
  while (!isVerbatim(container)) {
    let result: StartResult = 'none';
    for (const start of STARTS) {
      result = start(parser, container);
      if (result !== 'none') break;
    }
    if (result === 'done') return false;
    if (result === 'none') {
      parser.cursor.advanceToNonspace();
      break;
    }
    container = tipOf(parser);
    if (result === 'leaf') break;
  }
  return true;
}

function addLine(parser: Parser, node: BlockNode): void {
  const { cursor } = parser;
  if (node.kind === 'paragraph') node.lines.push(trimBlankStart(cursor.rest()));
  else if (node.kind === 'code' || node.kind === 'math') node.lines.push(cursor.rest());
  else if (node.kind === 'table') addTableRow(node, cursor.rest());
  else if (node.kind === 'html') {
    const line = cursor.rest();
    node.lines.push(line);
    if (node.ends?.test(line)) closeTip(parser);
  } else if (!cursor.blank) {
    addChild(parser, { kind: 'paragraph', lines: [] });
    cursor.advanceToNonspace();
    addLine(parser, tipOf(parser));
  }
}

function feedLine(parser: Parser, raw: string): void {
  parser.cursor.reset(raw);
  if (!matchOpenBlocks(parser) || !openNewBlocks(parser)) return;
  const tip = tipOf(parser);
  if (parser.matched < parser.stack.length && !parser.cursor.blank && tip.kind === 'paragraph') {
    addLine(parser, tip);
    return;
  }
  closeUnmatched(parser);
  addLine(parser, tipOf(parser));
}

export function parseBlocks(markdown: string): ParsedBlocks {
  const parser = createParser();
  for (const line of splitLines(markdown)) feedLine(parser, line);
  while (parser.stack.length > 1) closeTip(parser);
  return { document: parser.document, refs: parser.refs };
}
