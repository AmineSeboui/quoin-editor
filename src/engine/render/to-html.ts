import type { QuoinBlock } from '../model/quoin-block';
import type { Schema } from '../schema/types';
import { documentNodes } from './document-nodes';
import type { EmbedProvider } from './embed-provider';
import { serializeHtml } from './serialize-html';

export type HTMLOptions = {
  schema?: Schema;
  /** The address of a stored picture or file. One that is no http, https, blob, data or relative address is left out. */
  resolveAssetUrl?: (storageKey: string) => string;
  renderMath?: (latex: string, options: { displayMode: boolean }) => string;
  embeds?: 'iframe' | 'link';
  /** Tried before the built in providers, in order. Only used when `embeds` is `'iframe'`. */
  embedProviders?: readonly EmbedProvider[];
};

export const toHTML = (blocks: readonly QuoinBlock[], options: HTMLOptions = {}): string =>
  serializeHtml(documentNodes(blocks, options));
