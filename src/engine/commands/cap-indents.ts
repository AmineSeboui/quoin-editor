import type { Transaction } from '../state/transaction';
import { setIndentStep } from '../transform/attrs-steps';

type Level = { from: number; to: number };

// A block that keeps its indent has no lifted parent or sibling, so the blocks after it relate to each other as they
// did before the edit and the walk can stop there. Blocks before `end` were just inserted and never related to each
// other in this document, so the walk goes through all of them.
export function capIndents(tr: Transaction, start: number, end = start): void {
  const { blocks } = tr.doc;
  const base = start > 0 ? blocks[start - 1].indent : -1;
  const levels: Level[] = [];
  for (let at = start; at < blocks.length; at++) {
    const { id, indent } = blocks[at];
    let sibling: Level | undefined;
    while (levels.length > 0 && levels[levels.length - 1].from >= indent) sibling = levels.pop();
    const parent = levels.length > 0 ? levels[levels.length - 1].to : base;
    const next = sibling?.from === indent ? sibling.to : Math.min(indent, parent + 1);
    if (next === indent && at >= end) return;
    if (next !== indent) tr.step(setIndentStep(id, next));
    levels.push({ from: indent, to: next });
  }
}
