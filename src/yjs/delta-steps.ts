import { inlineLength } from '../engine/model/inline';
import { addMarkStep, removeMarkStep } from '../engine/transform/mark-steps';
import { replaceInlineStep } from '../engine/transform/replace-inline-step';
import type { Step } from '../engine/transform/step';
import { inlineOfOps, type InsertOp } from './inline-codec';
import { markFromAttribute } from './marks-codec';

export type DeltaOp = Partial<InsertOp> & { retain?: number; delete?: number };

function formatSteps(block: string, region: string, from: number, to: number, attributes: DeltaOp['attributes']) {
  return Object.entries(attributes ?? {}).map(([key, value]) =>
    value === null
      ? removeMarkStep(block, region, from, to, markFromAttribute(key, true))
      : addMarkStep(block, region, from, to, markFromAttribute(key, value)),
  );
}

/** The engine steps of a change to the text of one region, read in order as Yjs reports it. */
export function deltaSteps(block: string, region: string, delta: readonly DeltaOp[]): Step[] {
  const steps: Step[] = [];
  let at = 0;
  for (const op of delta) {
    if (op.retain !== undefined) {
      steps.push(...formatSteps(block, region, at, at + op.retain, op.attributes));
      at += op.retain;
    } else if (op.delete !== undefined) {
      steps.push(replaceInlineStep(block, region, at, at + op.delete, []));
    } else if (op.insert !== undefined) {
      const inline = inlineOfOps([op as InsertOp]);
      steps.push(replaceInlineStep(block, region, at, at, inline));
      at += inlineLength(inline);
    }
  }
  return steps;
}
