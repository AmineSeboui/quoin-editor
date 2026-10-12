import { ALWAYS_ESCAPED } from './escape-text';
import { writesMention } from './atom-markdown';
import type { Child } from './inline-tree';
import { autolinkOf } from './literal-ranges';
import type { RenderOptions } from './render-options';

export const OPENER = '<';

function textStart(text: string): string {
  const code = text.codePointAt(0);
  if (code === undefined) return '';
  const first = String.fromCodePoint(code);
  if (first === '\n') return first;
  return ALWAYS_ESCAPED.test(first) ? '\\' : first;
}

// The first character a child will print, which is all its left neighbour needs to know about it.
// Anything that opens a mark prints some punctuation, and every punctuation character classifies alike.
export function startOf(child: Child, options: RenderOptions): string {
  if (child.kind === 'range') return child.mark.type === 'link' && !autolinkOf(child, options) ? '[' : OPENER;
  const { node } = child;
  if (node.kind === 'text') return textStart(node.text);
  return writesMention(node, options) ? '[' : OPENER;
}
