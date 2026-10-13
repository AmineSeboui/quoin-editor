import { sanitizeHref } from '../markdown/urls';
import type { QuoinBlock } from '../model/quoin-block';
import { createSchema } from '../schema/create-schema';
import type { Schema } from '../schema/types';
import { indentAttr } from './block-attrs';
import { groupBlocks, type Entry, type Group } from './block-groups';
import { blockToHTML } from './block-to-html';
import type { EmbedProvider } from './embed-provider';
import { coreEmbedProviders } from './embed-providers';
import { engineBlocksOf } from './engine-blocks';
import type { HtmlEnv } from './html-env';
import { element, type Attr } from './html-tag';
import { collectHeadings } from './toc-html';

export type HTMLOptions = {
  schema?: Schema;
  resolveAssetUrl?: (storageKey: string) => string;
  renderMath?: (latex: string, options: { displayMode: boolean }) => string;
  embeds?: 'iframe' | 'link';
  /** Tried before the built in providers, in order. Only used when `embeds` is `'iframe'`. */
  embedProviders?: readonly EmbedProvider[];
};

type ListGroup = Extract<Group, { kind: 'list' }>;
type QuoteGroup = Extract<Group, { kind: 'quote' }>;

function listTag({ list, items }: ListGroup): { name: string; attrs: Attr[] } {
  if (list === 'task') return { name: 'ul', attrs: [['data-type', 'task']] };
  if (list === 'bullet') return { name: 'ul', attrs: [] };
  const { start } = items[0].block.attrs;
  return { name: 'ol', attrs: [['start', Number.isInteger(start) && start !== 1 ? String(start) : undefined]] };
}

function entryHTML({ block, excess, children }: Entry, env: HtmlEnv): string {
  return blockToHTML(block, { excess, children: groupsHTML(children, env) }, env);
}

function listHTML(group: ListGroup, env: HtmlEnv): string {
  const { name, attrs } = listTag(group);
  return element(name, attrs, group.items.map((item) => entryHTML(item, env)).join(''));
}

function quoteHTML({ items }: QuoteGroup, env: HtmlEnv): string {
  const lines = items.map(({ block }) => blockToHTML(block, { excess: 0, children: '' }, env));
  return element('blockquote', [indentAttr(items[0].excess)], lines.join(''));
}

function groupsHTML(groups: readonly Group[], env: HtmlEnv): string {
  return groups
    .map((group) => {
      if (group.kind === 'list') return listHTML(group, env);
      return group.kind === 'quote' ? quoteHTML(group, env) : entryHTML(group.entry, env);
    })
    .join('');
}

export function toHTML(blocks: readonly QuoinBlock[], options: HTMLOptions = {}): string {
  const schema = options.schema ?? createSchema();
  const engine = engineBlocksOf(blocks, schema);
  const env: HtmlEnv = {
    resolveAssetUrl: options.resolveAssetUrl ?? sanitizeHref,
    renderMath: options.renderMath,
    embeds: options.embeds ?? 'link',
    embedProviders: [...(options.embedProviders ?? []), ...coreEmbedProviders],
    headings: collectHeadings(engine, schema),
  };
  return groupsHTML(groupBlocks(engine), env);
}
