import type { EngineBlock, EngineDoc } from '../../engine/model/types';
import { graphemeCount, wordCount } from '../../engine/model/graphemes';
import { inlinePlainText } from '../../engine/render/block-plain-text';
import { countBlock, type TextStats } from '../../engine/render/count-block';
import { tableCells } from '../../engine/render/table-cells';
import type { Schema } from '../../engine/schema/types';

const ATTACHMENTS = new Set(['FILE', 'IMAGE', 'EMBED', 'BOOKMARK']);
const NOTHING: TextStats = { characters: 0, words: 0 };
const tables = new WeakMap<Schema, WeakMap<EngineBlock, TextStats>>();

function countTable(block: EngineBlock, schema: Schema): TextStats {
  const known = tables.get(schema) ?? new WeakMap<EngineBlock, TextStats>();
  tables.set(schema, known);
  let stats = known.get(block);
  if (stats) return stats;
  stats = { characters: 0, words: 0 };
  for (const cell of tableCells(block).flat()) {
    const text = inlinePlainText(cell, schema);
    stats.characters += graphemeCount(text);
    stats.words += wordCount(text);
  }
  known.set(block, stats);
  return stats;
}

const countOne = (block: EngineBlock, schema: Schema): TextStats =>
  ATTACHMENTS.has(block.type) ? NOTHING : block.type === 'TABLE' ? countTable(block, schema) : countBlock(block, schema);

/**
 * The characters and words a writer wrote, which the limit and the footer count: the text of every block as `countText`
 * reads it, but the cells of a table without the separators between them, and nothing for an image, a file, an embed
 * or a bookmark, whose names, addresses and titles come from an upload or the host.
 */
export function countWriting(doc: EngineDoc, schema: Schema): TextStats {
  let characters = 0;
  let words = 0;
  for (const block of doc.blocks) {
    const stats = countOne(block, schema);
    characters += stats.characters;
    words += stats.words;
  }
  return { characters, words };
}
