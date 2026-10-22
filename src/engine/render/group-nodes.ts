import { indentAttr } from './block-attrs';
import type { Entry, Group } from './block-groups';
import type { BlockRenderer, HtmlEnv } from './html-env';
import { element, type HtmlNode } from './html-node';

type ListGroup = Extract<Group, { kind: 'list' }>;

function listElement({ list, items }: ListGroup, children: HtmlNode[]): HtmlNode {
  if (list !== 'ordered') return element('ul', [['data-type', list === 'task' ? list : undefined]], children);
  const { start } = items[0].block.attrs;
  return element('ol', [['start', Number.isInteger(start) && start !== 1 ? String(start) : undefined]], children);
}

/** The nodes of grouped blocks: lists and quotes around their items, and each block drawn by `render`. */
export function groupNodes(groups: readonly Group[], env: HtmlEnv, render: BlockRenderer): HtmlNode[] {
  const entryNode = ({ block, excess, children }: Entry): HtmlNode =>
    render(block, { excess, children: groupNodes(children, env, render) }, env);
  return groups.map((group) => {
    if (group.kind === 'single') return entryNode(group.entry);
    if (group.kind === 'quote') {
      const lines = group.items.map(({ block }) => render(block, { excess: 0, children: [] }, env));
      return element('blockquote', [indentAttr(group.items[0].excess)], lines);
    }
    return listElement(group, group.items.map(entryNode));
  });
}
