import { compareCodeUnits } from '../../model/compare';
import type { Attrs } from '../../model/types';

/** The attributes, sorted by name, each named with `prefix`. */
export function dataAttributes(attrs: Attrs | undefined, prefix = 'data-attr-'): [string, string][] {
  return Object.keys(attrs ?? {})
    .sort(compareCodeUnits)
    .map((key) => [`${prefix}${key}`, (attrs as Attrs)[key]]);
}
