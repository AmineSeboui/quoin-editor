import type { BlockRenderer } from '../engine/render/html-env';
import { headingId } from '../engine/render/headings';
import { element, type HtmlNode } from '../engine/render/html-node';
import type { DiffMark } from './diff-document';
import type { DiffLabels } from './diff-labels';
import { deletedNodes } from './word-nodes';

/**
 * Draws a table of contents of the diff: a heading that moved is listed once, where it went, and a removed heading's
 * entry is deleted words.
 */
export function diffToc(marks: ReadonlyMap<string, DiffMark>, labels: DiffLabels, render: BlockRenderer): BlockRenderer {
  return (block, view, env) => {
    const statusOf = (blockId: string) => marks.get(blockId)?.status;
    const headings = env.headings.filter(({ blockId }) => statusOf(blockId) !== 'moved-away');
    const removed = new Set(headings.filter(({ blockId }) => statusOf(blockId) === 'removed').map(({ blockId }) => `#${headingId(blockId)}`));
    const marked = (node: HtmlNode): HtmlNode => {
      if (typeof node === 'string') return node;
      const href = node.attrs.find(([name]) => name === 'href')?.[1];
      if (node.tag === 'a' && typeof href === 'string' && removed.has(href)) {
        return element('a', node.attrs, [deletedNodes(node.children, labels)]);
      }
      return element(node.tag, node.attrs, node.children.map(marked), node.html);
    };
    return marked(render(block, view, { ...env, headings }));
  };
}
