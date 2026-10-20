'use client';

import { defineExtension, type EmbedProvider, type Extension } from '../../engine';
import type { BlockRenderProps, ViewController } from '../../view';
import type { ExtensionUI } from '../ui-types';
import { BookmarkBlock } from './BookmarkBlock';
import { EmbedBlock } from './EmbedBlock';
import type { EmbedFeature, Unfurl } from './embed-feature';
import { resolveEmbedLabels, type EmbedLabels } from './embed-labels';
import { embedSlashItems } from './embed-slash-items';
import { linkChoicePlugin, pasteLinkChoice } from './link-choice';
import { LinkChoicePopover } from './LinkChoicePopover';
import { LinkInputOverlay } from './LinkInputOverlay';

export type { UnfurledLink, Unfurl } from './embed-feature';

export type EmbedOptions = {
  /** Providers tried before the built-in ones, each turning the address of a page into the https address of a frame. */
  providers?: readonly EmbedProvider[];
  /** Looks up a bookmark with no title yet, once per bookmark and address. What it finds is written to the block. */
  unfurl?: Unfurl;
  /** Every string the feature shows or speaks, English by default. A key left out stays English. */
  labels?: Partial<EmbedLabels>;
};

/**
 * Embeds and bookmarks: EMBED blocks drawn as the sandboxed frame of an allowlisted provider, BOOKMARK blocks as link
 * cards, slash commands that ask for the link of either, and a choice of either for a link pasted alone on an empty
 * line.
 */
export function embedExtension(options: EmbedOptions = {}): Extension {
  const feature: EmbedFeature = {
    labels: resolveEmbedLabels(options.labels),
    providers: options.providers ?? [],
    unfurl: options.unfurl,
  };
  const EmbedRenderer = (props: BlockRenderProps) => <EmbedBlock {...props} feature={feature} />;
  const BookmarkRenderer = (props: BlockRenderProps) => <BookmarkBlock {...props} feature={feature} />;
  const ChoiceOverlay = ({ controller }: { controller: ViewController }) => (
    <LinkChoicePopover controller={controller} feature={feature} />
  );
  const InputOverlay = ({ controller }: { controller: ViewController }) => (
    <LinkInputOverlay controller={controller} feature={feature} />
  );
  const ui: ExtensionUI = {
    slashItems: embedSlashItems(feature.labels),
    renderers: { EMBED: EmbedRenderer, BOOKMARK: BookmarkRenderer },
    blockNames: { EMBED: feature.labels.embed, BOOKMARK: feature.labels.bookmark },
    overlays: [ChoiceOverlay, InputOverlay],
  };
  return defineExtension({ name: 'embed', plugins: [linkChoicePlugin], pasteRules: [pasteLinkChoice], ui });
}
