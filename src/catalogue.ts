'use client';

import type { Extension } from './engine';
import { createCatalogue, type CatalogueOptionsOf } from './extensions/create-catalogue';
// Through each feature's entry, which reaches the whole main entry, for the reason src/table.ts gives.
import { embedExtension } from './embed';
import { emojiExtension } from './emoji';
import { findExtension } from './find';
import { mathExtension } from './math';
import { mentionExtension } from './mention';
import { statsExtension } from './stats';
import { tableExtension } from './table';
import { tocExtension } from './toc';

const features = {
  table: tableExtension,
  embed: embedExtension,
  math: mathExtension,
  toc: tocExtension,
  mention: mentionExtension,
  emoji: emojiExtension,
  find: findExtension,
  stats: statsExtension,
};

export type CatalogueOptions = CatalogueOptionsOf<typeof features>;

/**
 * The extensions of every opt-in feature, for `BlockCanvas`'s `extensions`. Each feature takes its options under its
 * own name, and `false` leaves it out. A feature's options go here, as `catalogue({ math: { renderMath } })`: a
 * feature added again beside the catalogue mounts twice. The canvas reads its extensions when it mounts, so remount it
 * with a new `key` to change options or labels.
 */
export const catalogue: (options?: CatalogueOptions) => Extension[] = createCatalogue(features);
