import type { NewBlock } from '../../blocks/insert-blocks';
import type { EmbedProvider } from '../../engine';
import { linkAddress } from '../../menus/link/link-address';
import type { LinkKind } from './link-request';
import { matchEmbed } from './providers';
import { webAddress } from './web-address';

export function embedOf(href: string, providers: readonly EmbedProvider[]): NewBlock | null {
  const match = matchEmbed(href, providers);
  return match === null ? null : { type: 'EMBED', attrs: { url: href, provider: match.provider } };
}

export const bookmarkOf = (href: string): NewBlock => ({ type: 'BOOKMARK', attrs: { url: href } });

export type LinkProblem = 'notALink' | 'cannotEmbed';

export type TypedLink = {
  readonly href: string | null;
  readonly block: NewBlock | null;
  readonly problem: LinkProblem | null;
};

/** The block an address typed for an embed or a bookmark makes, or why it makes none. */
export function typedLink(kind: LinkKind, typed: string, providers: readonly EmbedProvider[]): TypedLink {
  const href = webAddress(linkAddress(typed));
  if (href === null) return { href, block: null, problem: 'notALink' };
  const block = kind === 'embed' ? embedOf(href, providers) : bookmarkOf(href);
  return { href, block, problem: block === null ? 'cannotEmbed' : null };
}
