import type { EngineBlock } from '../model/types';
import type { Schema } from '../schema/types';
import { indentAttr } from './block-attrs';
import { blockPlainText } from './block-plain-text';
import { escapeHtml } from './escape-html';
import { nestHeadings, type HeadingNode } from './heading-tree';
import { headingId, headingLevel, type Heading } from './headings';
import { element } from './html-tag';

export function collectHeadings(blocks: readonly EngineBlock[], schema: Schema): Heading[] {
  return blocks.flatMap((block) => {
    const level = headingLevel(block);
    const text = level === null ? '' : blockPlainText(block, schema);
    return level === null || text === '' ? [] : [{ blockId: block.id, level, text }];
  });
}

// Levels only grow along a chain of nodes, so the nesting is at most six deep.
function listHTML(nodes: readonly HeadingNode<Heading>[]): string {
  const items = nodes.map(({ heading, children }) => {
    const link = element('a', [['href', `#${headingId(heading.blockId)}`]], escapeHtml(heading.text));
    return element('li', [], link + (children.length > 0 ? listHTML(children) : ''));
  });
  return element('ul', [], items.join(''));
}

export function tocToHTML(headings: readonly Heading[], excess: number): string {
  const list = headings.length > 0 ? listHTML(nestHeadings(headings)) : '';
  return element('nav', [['data-toc', ''], indentAttr(excess)], list);
}
