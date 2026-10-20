'use client';

import type { Extension } from './engine';
import { createCatalogue, type CatalogueOptionsOf } from './extensions/create-catalogue';
// Through each feature's entry, which reaches the whole main entry, for the reason src/table.ts gives.
import { embedExtension } from './embed';
import { emojiExtension } from './emoji';
import { mathExtension } from './math';
import { mentionExtension } from './mention';
import { tableExtension } from './table';
import { tocExtension } from './toc';

const features = {
  table: tableExtension,
  embed: embedExtension,
  math: mathExtension,
  toc: tocExtension,
  mention: mentionExtension,
  emoji: emojiExtension,
};

export type CatalogueOptions = CatalogueOptionsOf<typeof features>;

/**
 * The extensions of every opt-in feature, for `BlockCanvas`'s `extensions`. Each feature takes its options under its
 * own name, and `false` leaves it out.
 */
export const catalogue: (options?: CatalogueOptions) => Extension[] = createCatalogue(features);
