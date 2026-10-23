import type { EngineDoc } from '../engine/model/types';
import type { Shared } from './shared';
import { syncBlock } from './sync-block';
import { insertBlocks, removeBlock } from './write-blocks';

/**
 * Writes the difference between two documents: blocks gone are taken out, blocks out of place are moved as a copy,
 * new blocks are written, and blocks kept in place are changed where they differ.
 */
export function syncDocs(shared: Shared, before: EngineDoc, after: EngineDoc): void {
  const order = before.blocks.map((block) => block.id);
  for (const id of [...order]) {
    if (after.index.has(id)) continue;
    removeBlock(shared, id);
    order.splice(order.indexOf(id), 1);
  }
  after.blocks.forEach((block, i) => {
    if (order[i] === block.id) {
      syncBlock(shared, before.blocks[before.index.get(block.id)!], block, order[i + 1] ?? null);
      return;
    }
    const at = order.indexOf(block.id, i);
    if (at > i) {
      removeBlock(shared, block.id);
      order.splice(at, 1);
    }
    insertBlocks(shared, order[i] ?? null, [block]);
    order.splice(i, 0, block.id);
  });
}
