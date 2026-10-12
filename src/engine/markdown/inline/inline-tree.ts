import { sameMark } from '../../model/marks';
import type { Inline, InlineNode, Mark } from '../../model/types';

export type Leaf = { readonly kind: 'leaf'; readonly node: InlineNode; readonly index: number };
export type Range = { readonly kind: 'range'; readonly mark: Mark; readonly children: Child[] };
export type Child = Leaf | Range;

// Marks arrive sorted by rank, so keeping the longest shared prefix of open marks nests them in rank order.
export function buildTree(nodes: Inline): Child[] {
  const root: Child[] = [];
  const open: Range[] = [];
  nodes.forEach((node, index) => {
    let shared = 0;
    while (shared < open.length && shared < node.marks.length && sameMark(open[shared].mark, node.marks[shared])) {
      shared++;
    }
    open.length = shared;
    for (const mark of node.marks.slice(shared)) {
      const range: Range = { kind: 'range', mark, children: [] };
      (open.at(-1)?.children ?? root).push(range);
      open.push(range);
    }
    (open.at(-1)?.children ?? root).push({ kind: 'leaf', node, index });
  });
  return root;
}
