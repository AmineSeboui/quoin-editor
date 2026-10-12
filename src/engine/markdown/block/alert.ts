import { joinLines, type BlockNode, type QuoteNode } from './block-tree';

const ALERT_LINE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*$/;
const TONES: Readonly<Record<string, string>> = {
  NOTE: 'info',
  TIP: 'tip',
  IMPORTANT: 'success',
  WARNING: 'warning',
  CAUTION: 'danger',
};

export type Alert = { tone: string; paragraphs: string[]; rest: BlockNode[] };

export function alertOf(quote: QuoteNode): Alert | null {
  const [first, ...children] = quote.children;
  const match = first?.kind === 'paragraph' ? ALERT_LINE.exec(first.lines[0]) : null;
  if (first?.kind !== 'paragraph' || !match) return null;
  const paragraphs = first.lines.length > 1 ? [joinLines(first.lines.slice(1))] : [];
  let used = 0;
  for (const node of children) {
    if (node.kind !== 'paragraph') break;
    paragraphs.push(joinLines(node.lines));
    used++;
  }
  return { tone: TONES[match[1]], paragraphs, rest: children.slice(used) };
}
