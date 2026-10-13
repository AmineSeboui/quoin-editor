import type { QuoinBlock } from '../model/quoin-block';
import { sameContent } from './block-change';
import { alignSteps, type Step } from './diff-steps';
import { pairLeftovers } from './pair-leftovers';

export type Expand = (block: QuoinBlock) => QuoinBlock[];

const isAnchor = (step: Step) => step.kind === 'pair' && sameContent(step.before, step.after);

const sameBlocks = (a: readonly QuoinBlock[], b: readonly QuoinBlock[]) =>
  a.length === b.length && a.every((block, index) => block === b[index]);

function refineGap(gap: readonly Step[], expand: Expand, byId: boolean): Step[] {
  const before = gap.flatMap((step) => (step.kind === 'insert' ? [] : [step.kind === 'pair' ? step.before : step.block]));
  const after = gap.flatMap((step) => (step.kind === 'delete' ? [] : [step.kind === 'pair' ? step.after : step.block]));
  const left = before.flatMap(expand);
  const right = after.flatMap(expand);
  const unchanged = sameBlocks(before, left) && sameBlocks(after, right);
  return pairLeftovers(unchanged ? gap : alignSteps(left, right, byId));
}

/**
 * Everything between two unchanged anchors is read again with 0.4 multi-node blocks split into their pieces, aligned
 * again, and its leftover deletions and insertions are paired by content.
 */
export function refineSteps(steps: readonly Step[], expand: Expand, byId: boolean): Step[] {
  const refined: Step[] = [];
  for (let start = 0; start < steps.length; ) {
    if (isAnchor(steps[start])) {
      refined.push(steps[start++]);
      continue;
    }
    let end = start;
    while (end < steps.length && !isAnchor(steps[end])) end++;
    refined.push(...refineGap(steps.slice(start, end), expand, byId));
    start = end;
  }
  return refined;
}
