'use client';

import type { Extension } from './engine';
import { createCatalogue, type CatalogueOptionsOf } from './extensions/create-catalogue';

const features = {};

export type CatalogueOptions = CatalogueOptionsOf<typeof features>;

/**
 * The extensions of every opt-in feature, for `BlockCanvas`'s `extensions`. Each feature takes its options under its
 * own name, and `false` leaves it out.
 */
export const catalogue: (options?: CatalogueOptions) => Extension[] = createCatalogue(features);
