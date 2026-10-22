import { indentAttr } from './block-attrs';
import type { Entry, Group } from './block-groups';
import type { BlockRenderer, HtmlEnv } from './html-env';
import { element, type Attr, type HtmlNode } from './html-node';

type ListGroup = Extract<Group, { kind: 'list' }>;

function listTag({ list, items }: ListGroup): { name: string; attrs: Attr[] } {
  if (list === 'task') return { name: 'ul', attrs: [['data-type', 'task']] };
  if (list === 'bullet') return { name: 'ul', attrs: [] };
  const { start } = items[0].block.attrs;
  return { name: 'ol', attrs: [['start', Number.isInteger(start) && start !== 1 ? String(start) : undefined]] };
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
    const { name, attrs } = listTag(group);
    return element(name, attrs, group.items.map(entryNode));
  });
}
