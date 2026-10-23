import type { EngineBlock, Inline } from '../model/types';
import type { EmbedProvider } from './embed-provider';
import type { Heading } from './headings';
import type { HtmlNode } from './html-node';
import { inlineNodes } from './inline-nodes';

export type HtmlEnv = {
  readonly resolveAssetUrl: (storageKey: string) => string | null;
  readonly renderMath?: (latex: string, options: { displayMode: boolean }) => string;
  readonly embeds: 'iframe' | 'link';
  readonly embedProviders: readonly EmbedProvider[];
  readonly headings: readonly Heading[];
  readonly taskLabel: string;
  readonly frameTitle: (provider: string) => string;
};

export type BlockView = {
  readonly excess: number;
  readonly children: HtmlNode[];
};

/** Draws one block; the nodes of the blocks it owns arrive as `view.children`. */
export type BlockRenderer = (block: EngineBlock, view: BlockView, env: HtmlEnv) => HtmlNode;

export const inlineOf = (inline: Inline | undefined, env: HtmlEnv): HtmlNode[] =>
  inlineNodes(inline ?? [], { renderMath: env.renderMath });
