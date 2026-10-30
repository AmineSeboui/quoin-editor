import { sameMark } from '../../model/marks';
import type { Inline, InlineNode, Mark } from '../../model/types';

export type Leaf = { readonly kind: 'leaf'; readonly node: InlineNode; readonly index: number };
export type Range = { readonly kind: 'range'; readonly mark: Mark; readonly children: Child[] };
export type Child = Leaf | Range;

function indexOfMark(node: InlineNode | undefined, mark: Mark, hint: number): number {
  if (!node) return -1;
  const { marks } = node;
  return marks[hint] && sameMark(marks[hint], mark) ? hint : marks.findIndex((other) => sameMark(other, mark));
}

// The number of nodes each mark of each node stays open for, counting the nodes before and after it.
function runLengths(nodes: Inline): number[][] {
  const before = nodes.map(() => [] as number[]);
  nodes.forEach((node, index) => {
    node.marks.forEach((mark, at) => {
      const match = indexOfMark(nodes[index - 1], mark, at);
      before[index][at] = match < 0 ? 1 : before[index - 1][match] + 1;
    });
  });
  const total = nodes.map(() => [] as number[]);
  for (let index = nodes.length - 1; index >= 0; index--) {
    nodes[index].marks.forEach((mark, at) => {
      const match = indexOfMark(nodes[index + 1], mark, at);
      total[index][at] = match < 0 ? before[index][at] : total[index + 1][match];
    });
  }
  return total;
}

// A mark that covers more nodes opens outside the marks it contains, whatever their rank. Equal spans keep rank order.
function nesting(nodes: Inline): Mark[][] {
  const lengths = runLengths(nodes);
  return nodes.map(({ marks }, index) =>
    marks
      .map((mark, at) => ({ mark, at }))
      .sort((x, y) => lengths[index][y.at] - lengths[index][x.at] || x.at - y.at)
      .map(({ mark }) => mark),
  );
}

export function buildTree(nodes: Inline): Child[] {
  const root: Child[] = [];
  const open: Range[] = [];
  const ordered = nesting(nodes);
  nodes.forEach((node, index) => {
    const marks = ordered[index];
    let shared = 0;
    while (shared < open.length && shared < marks.length && sameMark(open[shared].mark, marks[shared])) {
      shared++;
    }
    open.length = shared;
    for (const mark of marks.slice(shared)) {
      const range: Range = { kind: 'range', mark, children: [] };
      (open.at(-1)?.children ?? root).push(range);
      open.push(range);
    }
    (open.at(-1)?.children ?? root).push({ kind: 'leaf', node, index });
  });
  return root;
}
