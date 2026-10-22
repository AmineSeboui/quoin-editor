import type { BlockRenderer } from '../engine/render/html-env';
import { element, type HtmlNode } from '../engine/render/html-node';
import { changedNode } from './changed-node';
import type { DiffMark } from './diff-document';
import type { DiffLabels } from './diff-labels';

function markLabels({ status, change, attributes }: DiffMark, labels: DiffLabels): string[] {
  switch (status) {
    case 'added':
      return [labels.added];
    case 'removed':
      return [labels.removed];
    case 'moved-away':
      return [labels.movedAway];
    case 'moved':
      return change ? [labels.moved, labels.changed(attributes)] : [labels.moved];
    case 'changed':
      return [labels.changed(attributes)];
  }
}

// A list item stays the list's own child, so it carries the mark itself; any other block is wrapped.
function markedNode(node: HtmlNode, mark: DiffMark, labels: DiffLabels): HtmlNode {
  const shown = markLabels(mark, labels).map((text) => element('span', [['data-diff-label', '']], [text]));
  if (typeof node !== 'string' && node.tag === 'li') {
    return element('li', [...node.attrs, ['data-diff', mark.status]], [...shown, ...node.children]);
  }
  return element('div', [['data-diff', mark.status]], [...shown, node]);
}

/** Draws each block with `render`, and a block that differs between the versions with its mark and its word changes. */
export function diffRenderer(marks: ReadonlyMap<string, DiffMark>, labels: DiffLabels, render: BlockRenderer): BlockRenderer {
  return (block, view, env) => {
    const mark = marks.get(block.id);
    if (!mark) return render(block, view, env);
    const node = mark.change ? changedNode(block, view, env, mark.change, render, labels) : render(block, view, env);
    return markedNode(node, mark, labels);
  };
}
