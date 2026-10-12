import type { Attrs } from './types';

export function sameAttrs(a: Attrs | undefined, b: Attrs | undefined): boolean {
  const left = a ?? {};
  const right = b ?? {};
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((k) => left[k] === right[k]);
}
