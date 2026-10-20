'use client';

import type { Extension } from './engine';
import { createCatalogue, type CatalogueOptionsOf } from './extensions/create-catalogue';
// Through each feature's entry, which reaches the whole main entry, for the reason src/table.ts gives.
import { tableExtension } from './table';

const features = { table: tableExtension };

export type CatalogueOptions = CatalogueOptionsOf<typeof features>;

/**
 * The extensions of every opt-in feature, for `BlockCanvas`'s `extensions`. Each feature takes its options under its
 * own name, and `false` leaves it out.
 */
export const catalogue: (options?: CatalogueOptions) => Extension[] = createCatalogue(features);
