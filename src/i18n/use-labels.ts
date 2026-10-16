'use client';

import { useQuoin } from '../context';
import type { QuoinLabels } from './labels';

/** The labels of the canvas around the caller, English unless its host overrode some. */
export function useLabels(): QuoinLabels {
  return useQuoin().labels;
}
