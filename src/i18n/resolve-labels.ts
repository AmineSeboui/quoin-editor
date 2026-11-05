import { englishLabels } from './english-labels';
import type { QuoinLabels } from './labels';
import { mergeLabels } from './merge-labels';

/** The English labels with the host's overrides on top. A key the host leaves out, or passes as undefined, stays
 *  English. */
export const resolveLabels = (overrides?: Partial<QuoinLabels>): QuoinLabels => mergeLabels(englishLabels, overrides);
