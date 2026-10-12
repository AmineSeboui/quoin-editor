import { sameAttrs } from './attrs';
import { addMark, hasMark, removeMark, sameMarkSet, sortMarks } from './marks';
import type { AtomNode, Attrs, Inline, InlineNode, Mark, TextNode } from './types';

const OBJECT_REPLACEMENT = '\uFFFC';

export function text(value: string, marks: readonly Mark[] = []): TextNode {
  return { kind: 'text', text: value, marks: sortMarks(marks) };
}

export function atom(type: string, attrs: Attrs, marks: readonly Mark[] = []): AtomNode {
  return { kind: 'atom', type, attrs, marks: sortMarks(marks) };
}

function nodeLength(node: InlineNode): number {
  return node.kind === 'text' ? node.text.length : 1;
}

function withMarks(node: InlineNode, marks: readonly Mark[]): InlineNode {
  return node.kind === 'text' ? text(node.text, marks) : atom(node.type, node.attrs, marks);
}

function splitCodeBreaks(node: InlineNode): InlineNode[] {
  if (node.kind === 'atom' || !node.text.includes('\n') || !hasMark(node.marks, 'code')) return [node];
  const withoutCode = removeMark(node.marks, 'code');
  return node.text.split(/(\n)/).map((part) => text(part, part === '\n' ? withoutCode : node.marks));
}

export function normalizeInline(nodes: readonly InlineNode[]): Inline {
  const result: InlineNode[] = [];
  for (const node of nodes.flatMap(splitCodeBreaks)) {
    if (node.kind === 'text' && node.text === '') continue;
    const sorted = withMarks(node, node.marks);
    const last = result[result.length - 1];
    if (last?.kind === 'text' && sorted.kind === 'text' && sameMarkSet(last.marks, sorted.marks)) {
      result[result.length - 1] = text(last.text + sorted.text, last.marks);
    } else {
      result.push(sorted);
    }
  }
  return result;
}

export function inlineLength(inline: Inline): number {
  return inline.reduce((sum, node) => sum + nodeLength(node), 0);
}

export function inlineText(inline: Inline, atomText: (node: AtomNode) => string = () => OBJECT_REPLACEMENT): string {
  return inline.map((node) => (node.kind === 'text' ? node.text : atomText(node))).join('');
}

export function sliceInline(inline: Inline, from: number, to: number): Inline {
  const result: InlineNode[] = [];
  let start = 0;
  for (const node of inline) {
    const end = start + nodeLength(node);
    if (end > from && start < to) {
      const cutFrom = Math.max(0, from - start);
      result.push(node.kind === 'atom' ? node : text(node.text.slice(cutFrom, to - start), node.marks));
    }
    start = end;
  }
  return normalizeInline(result);
}

function assertRange(inline: Inline, from: number, to: number): number {
  const length = inlineLength(inline);
  if (from < 0 || from > to || to > length) {
    throw new RangeError(`range ${from} to ${to} is outside 0 to ${length}`);
  }
  return length;
}

export function replaceInline(inline: Inline, from: number, to: number, slice: Inline): Inline {
  const length = assertRange(inline, from, to);
  return normalizeInline([...sliceInline(inline, 0, from), ...slice, ...sliceInline(inline, to, length)]);
}

function mapMarksInRange(
  inline: Inline,
  from: number,
  to: number,
  update: (marks: readonly Mark[]) => readonly Mark[],
): Inline {
  assertRange(inline, from, to);
  const result: InlineNode[] = [];
  let start = 0;
  for (const node of inline) {
    const end = start + nodeLength(node);
    if (end <= from || start >= to) {
      result.push(node);
    } else if (node.kind === 'atom') {
      result.push(withMarks(node, update(node.marks)));
    } else {
      const cutFrom = Math.max(from, start) - start;
      const cutTo = Math.min(to, end) - start;
      result.push(
        text(node.text.slice(0, cutFrom), node.marks),
        text(node.text.slice(cutFrom, cutTo), update(node.marks)),
        text(node.text.slice(cutTo), node.marks),
      );
    }
    start = end;
  }
  return normalizeInline(result);
}

export function addMarkRange(inline: Inline, from: number, to: number, mark: Mark): Inline {
  return mapMarksInRange(inline, from, to, (marks) => addMark(marks, mark));
}

export function removeMarkRange(inline: Inline, from: number, to: number, mark: Mark | string): Inline {
  return mapMarksInRange(inline, from, to, (marks) => removeMark(marks, mark));
}

function nodeAt(inline: Inline, offset: number): InlineNode | undefined {
  let start = 0;
  for (const node of inline) {
    const end = start + nodeLength(node);
    if (offset >= start && offset < end) return node;
    start = end;
  }
  return undefined;
}

function isInclusiveMark(mark: Mark): boolean {
  return mark.type !== 'link' && mark.type !== 'comment';
}

export function marksAt(
  inline: Inline,
  offset: number,
  isInclusive: (mark: Mark) => boolean = isInclusiveMark,
): Mark[] {
  const before = nodeAt(inline, Math.max(0, offset - 1))?.marks ?? [];
  const after = nodeAt(inline, offset)?.marks ?? [];
  return before.filter((mark) => isInclusive(mark) || hasMark(after, mark));
}

export function rangeHasMark(inline: Inline, from: number, to: number, type: string): boolean {
  if (from === to) return hasMark(marksAt(inline, from), type);
  if (from > to) return false;
  let start = 0;
  for (const node of inline) {
    const end = start + nodeLength(node);
    if (end > from && start < to && !hasMark(node.marks, type)) return false;
    start = end;
  }
  return true;
}

function equalNode(a: InlineNode, b: InlineNode): boolean {
  if (!sameMarkSet(a.marks, b.marks)) return false;
  if (a.kind === 'text') return b.kind === 'text' && a.text === b.text;
  return b.kind === 'atom' && a.type === b.type && sameAttrs(a.attrs, b.attrs);
}

export function equalInline(a: Inline, b: Inline): boolean {
  return a.length === b.length && a.every((node, i) => equalNode(node, b[i]));
}
