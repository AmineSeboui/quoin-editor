import { englishLabels } from './english-labels';
import type { QuoinLabels } from './labels';

/** The English labels with the host's overrides on top. A key the host leaves out, or passes as undefined, stays
 *  English. */
export function resolveLabels(overrides?: Partial<QuoinLabels>): QuoinLabels {
  if (overrides === undefined) return englishLabels;
  const given = Object.entries(overrides).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishLabels : { ...englishLabels, ...Object.fromEntries(given) };
}
