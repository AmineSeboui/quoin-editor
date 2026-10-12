import { compareRegionNames } from './compare';
import { requireBlockIndex } from './doc';
import type { EngineDoc, Pos } from './types';

export function comparePos(doc: EngineDoc, a: Pos, b: Pos): number {
  return (
    requireBlockIndex(doc, a.block) - requireBlockIndex(doc, b.block) ||
    compareRegionNames(a.region, b.region) ||
    a.offset - b.offset
  );
}

export function orderedRange(doc: EngineDoc, anchor: Pos, head: Pos): { from: Pos; to: Pos } {
  return comparePos(doc, anchor, head) <= 0 ? { from: anchor, to: head } : { from: head, to: anchor };
}
