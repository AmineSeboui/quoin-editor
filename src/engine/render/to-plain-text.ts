import type { QuoinBlock } from '../model/quoin-block';
import { createSchema } from '../schema/create-schema';
import type { Schema } from '../schema/types';
import { blockPlainText } from './block-plain-text';
import { engineBlocksOf } from './engine-blocks';

export function plainTextBlocks(blocks: readonly QuoinBlock[], schema: Schema): string[] {
  return engineBlocksOf(blocks, schema).map((block) => blockPlainText(block, schema));
}

export function toPlainText(blocks: readonly QuoinBlock[], options: { schema?: Schema } = {}): string {
  return plainTextBlocks(blocks, options.schema ?? createSchema()).join('\n');
}
