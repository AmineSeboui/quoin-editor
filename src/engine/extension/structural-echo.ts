import type { QuoinBlock } from '../model/quoin-block';
import { sameBlock } from './same-blocks';

export type Emission = { readonly blocks: readonly QuoinBlock[]; readonly sequence: number };

const sameIds = (a: readonly QuoinBlock[], b: readonly QuoinBlock[]) =>
  a.length === b.length && a.every((block, i) => block.id === b[i].id);

/**
 * The sequence of the oldest emission that `incoming` is a deep copy of. Only emissions whose ids line up are
 * deep-compared, and consecutive emissions share most block objects, so each block object is compared once: ids
 * are unique within an emission, so a block that passed the id check always meets the same incoming block.
 */
export function copiedSequence(emissions: readonly Emission[], incoming: readonly QuoinBlock[]): number | undefined {
  const verdicts = new Map<QuoinBlock, boolean>();
  const sameAt = (block: QuoinBlock, index: number) => {
    const known = verdicts.get(block);
    if (known !== undefined) return known;
    const same = sameBlock(block, incoming[index]);
    verdicts.set(block, same);
    return same;
  };
  return emissions.find(({ blocks }) => sameIds(blocks, incoming) && blocks.every(sameAt))?.sequence;
}
