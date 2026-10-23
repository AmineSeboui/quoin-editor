import { sanitizeHref } from '../markdown/urls';
import type { QuoinBlock } from '../model/quoin-block';
import { createSchema } from '../schema/create-schema';
import { groupBlocks } from './block-groups';
import { blockNode } from './block-node';
import { coreEmbedProviders } from './embed-providers';
import { engineBlocksOf } from './engine-blocks';
import { groupNodes } from './group-nodes';
import type { BlockRenderer, HtmlEnv } from './html-env';
import type { HtmlNode } from './html-node';
import type { HTMLOptions } from './to-html';
import { collectHeadings } from './toc-node';

/** The HTML of a document as nodes, which `toHTML` writes out and a React view draws. */
export function documentNodes(blocks: readonly QuoinBlock[], options: HTMLOptions = {}, render: BlockRenderer = blockNode): HtmlNode[] {
  const schema = options.schema ?? createSchema();
  const engine = engineBlocksOf(blocks, schema);
  const env: HtmlEnv = {
    resolveAssetUrl: options.resolveAssetUrl ?? sanitizeHref,
    renderMath: options.renderMath,
    embeds: options.embeds ?? 'link',
    embedProviders: [...(options.embedProviders ?? []), ...coreEmbedProviders],
    headings: collectHeadings(engine, schema),
    taskLabel: options.taskLabel ?? 'Task',
    frameTitle: options.frameTitle ?? String,
  };
  return groupNodes(groupBlocks(engine), env, render);
}
