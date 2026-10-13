import type { QuoinBlock } from '../model/quoin-block';

function sameData(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  if (a === b) return true;
  const keys = Object.keys(a);
  const same = (key: string) => Object.hasOwn(b, key) && Object.is(a[key], b[key]);
  return keys.length === Object.keys(b).length && keys.every(same);
}

function sameBlock(a: QuoinBlock, b: QuoinBlock): boolean {
  return (
    a === b ||
    (a.id === b.id && a.type === b.type && (a.indent ?? 0) === (b.indent ?? 0) && sameData(a.data, b.data))
  );
}

/** Whether two documents hold the same blocks in the same order, comparing each block's data one level deep. */
export function sameBlocks(a: readonly QuoinBlock[], b: readonly QuoinBlock[]): boolean {
  return a === b || (a.length === b.length && a.every((block, i) => sameBlock(block, b[i])));
}
