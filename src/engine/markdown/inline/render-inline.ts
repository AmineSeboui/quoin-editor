import type { Inline, InlineNode } from '../../model/types';
import { atomMarkdown } from './atom-markdown';
import { OPENER, startOf } from './edge-chars';
import { escapeText } from './escape-text';
import { buildTree, type Child, type Leaf, type Range } from './inline-tree';
import { renderLiteral } from './literal-ranges';
import { wrapRange } from './range-wrapper';
import type { RenderOptions } from './render-options';

const TAIL_LENGTH = 8;

type Frame = {
  readonly range?: Range;
  readonly children: readonly Child[];
  readonly before: string;
  readonly after: string;
  readonly closing: string;
  at: number;
  out: string;
  tail: string;
};

function tailOf(before: string, piece: string): string {
  return (piece.length >= TAIL_LENGTH ? piece : before + piece).slice(-TAIL_LENGTH);
}

function append(frame: Frame, piece: string): void {
  frame.out += piece;
  frame.tail = tailOf(frame.tail, piece);
}

function rangeFrame(range: Range, before: string, after: string): Frame {
  const tail = tailOf(before, OPENER);
  return { range, children: range.children, before, after, closing: OPENER, at: 0, out: '', tail };
}

function lastContent(node: InlineNode | undefined): string {
  if (!node) return '';
  return node.kind === 'text' ? node.text.slice(-1) : '\uFFFC';
}

function firstContent(node: InlineNode | undefined): string {
  if (!node) return '';
  return node.kind === 'text' ? node.text.slice(0, 1) : '\uFFFC';
}

// Every piece is rendered knowing the tail of what precedes it and the first character of what follows it.
// A range is rendered from the inside out, so its delimiters are picked once its content is known.
// An explicit stack of frames stands in for recursion, because a node can carry thousands of marks.
export function renderInline(nodes: Inline, options: RenderOptions): string {
  function renderLeaf({ node, index }: Leaf, before: string, after: string): string {
    if (node.kind === 'atom') return atomMarkdown(node, after, options);
    return escapeText(node.text, {
      lineStart: before === '' || before.endsWith('\\\n'),
      lineEnd: after === '' || after === '\n',
      escapeLineStart: options.escapeLineStart,
      escapePipes: options.escapePipes,
      hardBreak: options.hardBreak,
      next: after,
      previous: lastContent(nodes[index - 1]),
      following: firstContent(nodes[index + 1]),
    });
  }

  const root: Frame = { children: buildTree(nodes), before: '', after: '', closing: '', at: 0, out: '', tail: '' };
  const stack = [root];
  for (;;) {
    const frame = stack[stack.length - 1];
    if (frame.at < frame.children.length) {
      const child = frame.children[frame.at++];
      const next = frame.at < frame.children.length ? startOf(frame.children[frame.at], options) : frame.closing;
      const literal = child.kind === 'range' ? renderLiteral(child, options) : renderLeaf(child, frame.tail, next);
      if (literal !== null) append(frame, literal);
      else if (child.kind === 'range') stack.push(rangeFrame(child, frame.tail, next));
    } else {
      stack.pop();
      if (!frame.range) return frame.out;
      const { open, close } = wrapRange(frame.range.mark, frame.before, frame.out, frame.after, options);
      append(stack[stack.length - 1], open + frame.out + close);
    }
  }
}
