import type { EngineBlock } from '../model/types';
import type { Schema } from '../schema/types';
import { indentAttr } from './block-attrs';
import { blockPlainText } from './block-plain-text';
import { escapeHtml } from './escape-html';
import { element } from './html-tag';
import { headingId, headingLevel, type Heading } from './headings';

type TocNode = { readonly heading: Heading; readonly children: TocNode[] };

export function collectHeadings(blocks: readonly EngineBlock[], schema: Schema): Heading[] {
  return blocks.flatMap((block) => {
    const level = headingLevel(block);
    const text = level === null ? '' : blockPlainText(block, schema);
    return level === null || text === '' ? [] : [{ id: headingId(block.id), level, text }];
  });
}

function nest(headings: readonly Heading[]): TocNode[] {
  const roots: TocNode[] = [];
  const open: TocNode[] = [];
  for (const heading of headings) {
    while (open.length > 0 && open[open.length - 1].heading.level >= heading.level) open.pop();
    const node: TocNode = { heading, children: [] };
    (open[open.length - 1]?.children ?? roots).push(node);
    open.push(node);
  }
  return roots;
}

// Levels only grow along a chain of nodes, so the nesting is at most six deep.
function listHTML(nodes: readonly TocNode[]): string {
  const items = nodes.map(({ heading, children }) => {
    const link = element('a', [['href', `#${heading.id}`]], escapeHtml(heading.text));
    return element('li', [], link + (children.length > 0 ? listHTML(children) : ''));
  });
  return element('ul', [], items.join(''));
}

export function tocToHTML(headings: readonly Heading[], excess: number): string {
  return element('nav', [['data-toc', ''], indentAttr(excess)], headings.length > 0 ? listHTML(nest(headings)) : '');
}
