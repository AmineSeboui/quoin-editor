import type { QuoinBlock } from '../model/quoin-block';
import { sameValue } from '../model/same-value';

export function sameBlock(a: QuoinBlock, b: QuoinBlock): boolean {
  return (
    a === b ||
    (a.id === b.id && a.type === b.type && (a.indent ?? 0) === (b.indent ?? 0) && sameValue(a.data, b.data))
  );
}

/** Whether two documents hold the same blocks in the same order, comparing each block's data deeply. */
export function sameBlocks(a: readonly QuoinBlock[], b: readonly QuoinBlock[]): boolean {
  return a === b || (a.length === b.length && a.every((block, i) => sameBlock(block, b[i])));
}
