import type { QuoinBlock } from '../types';
import { sameBlocks } from './same-blocks';

/**
 * Whether `blocks` hands back an outstanding emission, as the same array or a structural copy of it.
 * The host has then caught up to that emission, so it and every older one are forgotten, which lets a
 * later replay of one from the host's undo stack read as a document of its own. A copy is matched to
 * the oldest emission it equals, so a document that returns to an earlier state cannot skip the
 * emissions in between.
 */
export function acknowledge(outstanding: Set<QuoinBlock[]>, blocks: QuoinBlock[]): boolean {
  const echoed = outstanding.has(blocks) ? blocks : [...outstanding].find((emitted) => sameBlocks(emitted, blocks));
  if (!echoed) return false;
  for (const emitted of outstanding) {
    outstanding.delete(emitted);
    if (emitted === echoed) break;
  }
  return true;
}
