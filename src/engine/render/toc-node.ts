import type { EngineBlock } from '../model/types';
import type { Schema } from '../schema/types';
import { indentAttr } from './block-attrs';
import { blockPlainText } from './block-plain-text';
import { nestHeadings, type HeadingNode } from './heading-tree';
import { headingId, headingLevel, type Heading } from './headings';
import { element, type HtmlNode } from './html-node';

export function collectHeadings(blocks: readonly EngineBlock[], schema: Schema): Heading[] {
  return blocks.flatMap((block) => {
    const level = headingLevel(block);
    const text = level === null ? '' : blockPlainText(block, schema);
    return level === null || text === '' ? [] : [{ blockId: block.id, level, text }];
  });
}

// Levels only grow along a chain of nodes, so the nesting is at most six deep.
function listNode(nodes: readonly HeadingNode<Heading>[]): HtmlNode {
  const items = nodes.map(({ heading, children }) => {
    const link = element('a', [['href', `#${headingId(heading.blockId)}`]], [heading.text]);
    return element('li', [], children.length > 0 ? [link, listNode(children)] : [link]);
  });
  return element('ul', [], items);
}

export function tocNode(headings: readonly Heading[], excess: number): HtmlNode {
  return element('nav', [['data-toc', ''], indentAttr(excess)], headings.length > 0 ? [listNode(nestHeadings(headings))] : []);
}
