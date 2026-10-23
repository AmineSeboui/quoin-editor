import { equalNode, inlineLength, sliceInline, text } from '../engine/model/inline';
import type { Inline, InlineNode } from '../engine/model/types';

const units = (inline: Inline): InlineNode[] =>
  inline.flatMap((node): InlineNode[] =>
    node.kind === 'text' ? Array.from({ length: node.text.length }, (_, i) => text(node.text[i], node.marks)) : [node],
  );

/** The span of `before` that `after` changes and what replaces it, trimmed of what both share at either end. */
export function changedSpan(before: Inline, after: Inline): { from: number; to: number; slice: Inline } {
  const a = units(before);
  const b = units(after);
  let start = 0;
  while (start < a.length && start < b.length && equalNode(a[start], b[start])) start += 1;
  let end = 0;
  const shared = Math.min(a.length, b.length) - start;
  while (end < shared && equalNode(a[a.length - 1 - end], b[b.length - 1 - end])) end += 1;
  return { from: start, to: inlineLength(before) - end, slice: sliceInline(after, start, inlineLength(after) - end) };
}
