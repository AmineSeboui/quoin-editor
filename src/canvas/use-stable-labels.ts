import { useMemo, useState } from 'react';
import type { QuoinLabels } from '../i18n/labels';
import { resolveLabels } from '../i18n/resolve-labels';

type Overrides = Partial<QuoinLabels> | undefined;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function sameEntries(a: Readonly<Record<string, unknown>>, b: Readonly<Record<string, unknown>>, deeper: boolean): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => {
    const [x, y] = [a[key], b[key]];
    return Object.is(x, y) || (deeper && isRecord(x) && isRecord(y) && sameEntries(x, y, false));
  });
}

// Two levels, since blockNames, groups, colors and calloutTones are maps of names a host writes inline as well.
const sameOverrides = (a: Overrides, b: Overrides): boolean =>
  a === b || (a !== undefined && b !== undefined && sameEntries(a, b, true));

/**
 * The host's labels over the English ones, resolved again only when they change: an object written inline on each
 * render that holds the same words keeps the labels, and everything that reads them, as they were.
 */
export function useStableLabels(overrides: Overrides): QuoinLabels {
  const [kept, setKept] = useState(overrides);
  if (!sameOverrides(kept, overrides)) setKept(overrides);
  return useMemo(() => resolveLabels(kept), [kept]);
}
