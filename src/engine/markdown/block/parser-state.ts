import type { LinkTarget } from '../inline/link-syntax';
import { canContain, type BlockNode, type DocumentNode } from './block-tree';
import { Cursor } from './lines';
import { takeReferenceDefinitions } from './references';
import { summaryText } from './summary-text';

export const MAX_NESTING = 64;

export type StartResult = 'none' | 'container' | 'leaf' | 'done';

export type Continue = 'matched' | 'unmatched' | 'consumed';

export type Parser = {
  readonly document: DocumentNode;
  readonly stack: BlockNode[];
  readonly refs: Map<string, LinkTarget>;
  readonly cursor: Cursor;
  matched: number;
};

export type BlockStart = (parser: Parser, container: BlockNode) => StartResult;

export function createParser(): Parser {
  const document: DocumentNode = { kind: 'document', children: [] };
  return { document, stack: [document], refs: new Map(), cursor: new Cursor(), matched: 1 };
}

export const tipOf = (parser: Parser): BlockNode => parser.stack[parser.stack.length - 1];

export const canNest = (parser: Parser): boolean => parser.stack.length < MAX_NESTING;

const childrenOf = (node: BlockNode): BlockNode[] => (node as { children: BlockNode[] }).children;

export function closeTip(parser: Parser): void {
  const node = parser.stack.pop();
  if (node?.kind === 'paragraph') {
    node.lines = takeReferenceDefinitions(node.lines, parser.refs);
    if (node.lines.length === 0) childrenOf(tipOf(parser)).pop();
  } else if (node?.kind === 'html' && node.summaryOf) {
    childrenOf(tipOf(parser)).pop();
    node.summaryOf.summary = summaryText(node.lines);
  } else if (node?.kind === 'code' && node.fence === null) {
    while (node.lines.length > 0 && /^ *$/.test(node.lines[node.lines.length - 1])) node.lines.pop();
  }
}

export function closeUnmatched(parser: Parser): void {
  while (parser.stack.length > parser.matched) closeTip(parser);
}

export function addChild(parser: Parser, node: BlockNode): void {
  closeUnmatched(parser);
  while (!canContain(tipOf(parser), node.kind)) closeTip(parser);
  childrenOf(tipOf(parser)).push(node);
  parser.stack.push(node);
  parser.matched = parser.stack.length;
}
