import type { QuoinBlock } from '../model/quoin-block';
import { sameValue } from '../model/same-value';

const WORD = /[\p{L}\p{N}_]+/gu;

export type BlockProfile = {
  readonly block: QuoinBlock;
  readonly words: ReadonlyMap<string, number>;
  readonly total: number;
};

function collectWords(value: unknown, words: Map<string, number>): void {
  if (typeof value === 'string') {
    for (const [word] of value.matchAll(WORD)) words.set(word, (words.get(word) ?? 0) + 1);
  } else if (Array.isArray(value)) {
    for (const item of value) collectWords(item, words);
  } else if (typeof value === 'object' && value !== null) {
    for (const item of Object.values(value)) collectWords(item, words);
  }
}

export function profileOf(block: QuoinBlock): BlockProfile {
  const words = new Map<string, number>();
  collectWords(block.data, words);
  let total = 0;
  for (const count of words.values()) total += count;
  return { block, words, total };
}

/** The Dice overlap of the words in two blocks of one type, from 0 for nothing shared to 1 for the same words. */
export function similarity(a: BlockProfile, b: BlockProfile): number {
  if (a.block.type !== b.block.type) return 0;
  if (a.total === 0 && b.total === 0) return sameValue(a.block.data, b.block.data) ? 1 : 0;
  let shared = 0;
  for (const [word, count] of a.words) shared += Math.min(count, b.words.get(word) ?? 0);
  return (2 * shared) / (a.total + b.total);
}
