import type { Transaction } from '../state/transaction';
import { setIndentStep } from '../transform/attrs-steps';

type Level = { from: number; to: number };

// Only lifted blocks are stacked: a block that keeps its indent has no lifted parent or sibling, so the blocks after
// it relate to each other as they did before the edit and the walk can stop there.
export function capIndents(tr: Transaction, start: number): void {
  const { blocks } = tr.doc;
  const base = start > 0 ? blocks[start - 1].indent : -1;
  const lifted: Level[] = [];
  for (const { id, indent } of blocks.slice(start)) {
    let sibling: Level | undefined;
    while (lifted.length > 0 && lifted[lifted.length - 1].from >= indent) sibling = lifted.pop();
    const parent = lifted.length > 0 ? lifted[lifted.length - 1].to : base;
    const next = sibling?.from === indent ? sibling.to : Math.min(indent, parent + 1);
    if (next === indent) return;
    tr.step(setIndentStep(id, next));
    lifted.push({ from: indent, to: next });
  }
}
