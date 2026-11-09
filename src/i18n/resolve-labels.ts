import { englishLabels } from './english-labels';
import type { QuoinLabels } from './labels';
import { mergeLabels } from './merge-labels';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

// `blockNames`, `groups`, `colors` and `calloutTones` each hold a map of names rather than one name. A host renaming
// one entry writes that entry alone, and taking the map as given would leave every other name undefined and draw blank.
function ontoRecords(overrides: Partial<QuoinLabels>): Partial<QuoinLabels> {
  const taken = Object.entries(overrides).map(([key, value]) => {
    const fallback = englishLabels[key as keyof QuoinLabels];
    return [key, isRecord(value) && isRecord(fallback) ? { ...fallback, ...value } : value];
  });
  return Object.fromEntries(taken) as Partial<QuoinLabels>;
}

/** The English labels with the host's overrides on top. A key the host leaves out, or passes as undefined, stays
 *  English, and so does every entry of a record it overrides only part of. */
export const resolveLabels = (overrides?: Partial<QuoinLabels>): QuoinLabels =>
  mergeLabels(englishLabels, overrides && ontoRecords(overrides));
