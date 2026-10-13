import type { QuoinBlock } from '../model/quoin-block';
import type { EngineBlock, EngineDoc } from '../model/types';
import { createSchema } from '../schema/create-schema';
import type { Schema } from '../schema/types';
import { countBlock, type TextStats } from './count-block';
import { engineBlocksOf } from './engine-blocks';

let defaultSchema: Schema | undefined;

function sum(blocks: readonly EngineBlock[], schema: Schema): TextStats {
  let characters = 0;
  let words = 0;
  for (const block of blocks) {
    const stats = countBlock(block, schema);
    characters += stats.characters;
    words += stats.words;
  }
  return { characters, words };
}

export function countText(blocks: readonly QuoinBlock[], options: { schema?: Schema } = {}): TextStats {
  const schema = options.schema ?? (defaultSchema ??= createSchema());
  return sum(engineBlocksOf(blocks, schema), schema);
}

/** Counts a document from per-block counts kept for each block object, so a keystroke recounts one block. */
export function countDoc(doc: EngineDoc, options: { schema?: Schema } = {}): TextStats {
  return sum(doc.blocks, options.schema ?? (defaultSchema ??= createSchema()));
}
