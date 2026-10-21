import type { EmbedProvider } from '../../engine';
import type { EmbedLabels } from './embed-labels';

/**
 * What a host found at a bookmark's address. Only non-empty strings are kept, a title is required, and a picture is
 * kept only at an http or https address.
 */
export type UnfurledLink = { title?: string; description?: string; image?: string };

/** Looks up a bookmark's address for the host, as a server that reads the page's metadata would. */
export type Unfurl = (url: string) => Promise<UnfurledLink | null | undefined>;

/** The options of one embed extension, resolved once, shared by its blocks and overlays. */
export type EmbedFeature = {
  readonly labels: EmbedLabels;
  readonly providers: readonly EmbedProvider[];
  readonly unfurl: Unfurl | undefined;
};
