import { trimBlankEnd, trimBlankStart } from './lines';

export type Align = 'left' | 'center' | 'right' | null;

export type Fence = { readonly char: string; readonly length: number; readonly offset: number };

export type ListMarker = { readonly ordered: boolean; readonly char: string; readonly number: number };

export type DocumentNode = { kind: 'document'; children: BlockNode[] };
export type QuoteNode = { kind: 'quote'; children: BlockNode[] };
export type ListNode = { kind: 'list'; marker: ListMarker; children: ItemNode[] };
export type ItemNode = { kind: 'item'; marker: ListMarker; contentOffset: number; children: BlockNode[] };
export type DetailsNode = { kind: 'details'; open: boolean; summary: string | null; children: BlockNode[] };

export type ParagraphNode = { kind: 'paragraph'; lines: string[] };
export type HeadingNode = { kind: 'heading'; level: number; text: string };
export type BreakNode = { kind: 'break' };
export type CodeNode = { kind: 'code'; fence: Fence | null; info: string; lines: string[] };
export type MathNode = { kind: 'math'; fence: Fence; lines: string[] };
export type HtmlNode = { kind: 'html'; ends: RegExp | null; lines: string[]; summaryOf?: DetailsNode };
export type QuoinNode = { kind: 'quoin'; type: string; data: Record<string, unknown>; indent: number };
export type TableNode = { kind: 'table'; align: Align[]; header: string[]; rows: string[][] };

export type ContainerNode = DocumentNode | QuoteNode | ListNode | ItemNode | DetailsNode;
export type LeafNode = ParagraphNode | HeadingNode | BreakNode | CodeNode | MathNode | HtmlNode | QuoinNode | TableNode;
export type BlockNode = ContainerNode | LeafNode;

export function canContain(parent: BlockNode, child: BlockNode['kind']): boolean {
  switch (parent.kind) {
    case 'list':
      return child === 'item';
    case 'document':
    case 'quote':
    case 'item':
    case 'details':
      return child !== 'item';
    default:
      return false;
  }
}

export const joinLines = (lines: readonly string[]): string => trimBlankEnd(lines.join('\n'));

export function textLinesOf(node: BlockNode | undefined): string[] | null {
  if (node?.kind === 'paragraph') return node.lines;
  return node?.kind === 'html' ? node.lines.map((line) => trimBlankStart(line)) : null;
}
