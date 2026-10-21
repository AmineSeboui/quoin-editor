import { idOf, type YBlock, type YBlocks } from './doc-shape';

/**
 * The blocks of the shared array with the first of each id, and the indexes of later copies. Two clients moving one
 * block at once each insert a copy of it; every client keeps the same one, since all see the array in the same order.
 */
export function uniqueBlocks(blocks: YBlocks): { kept: YBlock[]; copies: number[] } {
  const seen = new Set<string>();
  const kept: YBlock[] = [];
  const copies: number[] = [];
  blocks.toArray().forEach((block, index) => {
    const id = idOf(block);
    if (seen.has(id)) copies.push(index);
    else kept.push(block);
    seen.add(id);
  });
  return { kept, copies };
}

export function removeCopies(blocks: YBlocks, copies: readonly number[]): void {
  for (const index of [...copies].reverse()) blocks.delete(index, 1);
}
