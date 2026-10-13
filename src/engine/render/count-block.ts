import { graphemeCount, wordCount } from '../model/graphemes';
import type { EngineBlock } from '../model/types';
import type { Schema } from '../schema/types';
import { blockPlainText } from './block-plain-text';

export type TextStats = { characters: number; words: number };

// An engine block is never changed in place, so what was counted for one object stays true for it.
const counted = new WeakMap<Schema, WeakMap<EngineBlock, TextStats>>();

export function countBlock(block: EngineBlock, schema: Schema): TextStats {
  let blocks = counted.get(schema);
  if (!blocks) counted.set(schema, (blocks = new WeakMap()));
  const known = blocks.get(block);
  if (known) return known;
  const text = blockPlainText(block, schema);
  const stats = { characters: graphemeCount(text), words: wordCount(text) };
  blocks.set(block, stats);
  return stats;
}
