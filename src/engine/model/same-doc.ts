import { sameValue } from './same-value';
import type { EngineDoc } from './types';

export function sameDoc(a: EngineDoc, b: EngineDoc): boolean {
  return a === b || (a.blocks.length === b.blocks.length && a.blocks.every((block, i) => sameValue(block, b.blocks[i])));
}
