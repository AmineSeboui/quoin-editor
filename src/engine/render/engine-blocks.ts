import { createBlockCodec } from '../blocks/codec';
import type { QuoinBlock } from '../model/quoin-block';
import type { EngineBlock } from '../model/types';
import type { Schema } from '../schema/types';

// A repeated id, such as a split piece that collides with another block, comes from a counter, so the same blocks always render the same HTML.
export function engineBlocksOf(blocks: readonly QuoinBlock[], schema: Schema): readonly EngineBlock[] {
  const used = new Set(blocks.map((block) => block.id));
  let next = 0;
  const newId = () => {
    let id: string;
    do id = `split-${next++}`;
    while (used.has(id));
    return id;
  };
  const codec = createBlockCodec(schema, { newId });
  return codec.docFromBlocks(blocks).blocks;
}
