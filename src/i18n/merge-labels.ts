/**
 * A set of labels with a caller's overrides on top, the defaults themselves when it overrides nothing, so a feature
 * can compare by identity. A key left out, or passed as undefined, keeps its default.
 */
export function mergeLabels<T extends object>(defaults: T, overrides?: Partial<T>): T {
  if (overrides === undefined) return defaults;
  const given = Object.entries(overrides).filter(([, value]) => value !== undefined);
  return given.length === 0 ? defaults : { ...defaults, ...(Object.fromEntries(given) as Partial<T>) };
}
