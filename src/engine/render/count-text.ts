import { graphemeCount, wordCount } from '../model/graphemes';
import type { QuoinBlock } from '../model/quoin-block';
import { createSchema } from '../schema/create-schema';
import type { Schema } from '../schema/types';
import { plainTextBlocks } from './to-plain-text';

export function countText(
  blocks: readonly QuoinBlock[],
  options: { schema?: Schema } = {},
): { characters: number; words: number } {
  let characters = 0;
  let words = 0;
  for (const text of plainTextBlocks(blocks, options.schema ?? createSchema())) {
    characters += graphemeCount(text);
    words += wordCount(text);
  }
  return { characters, words };
}
