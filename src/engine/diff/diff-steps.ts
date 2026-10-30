import type { QuoinBlock } from '../model/quoin-block';
import { sameContent } from './block-change';
import { diffSequences, type DiffOp } from './myers';

export type Step =
  | { kind: 'pair'; before: QuoinBlock; after: QuoinBlock }
  | { kind: 'delete'; block: QuoinBlock }
  | { kind: 'insert'; block: QuoinBlock };

const idOf = (block: QuoinBlock) => block.id;

function stepsOf(ops: readonly DiffOp<unknown>[], a: readonly QuoinBlock[], b: readonly QuoinBlock[]): Step[] {
  const steps: Step[] = [];
  let i = 0;
  let j = 0;
  for (const { op, items } of ops) {
    for (let n = 0; n < items.length; n++) {
      if (op === 'equal') steps.push({ kind: 'pair', before: a[i++], after: b[j++] });
      else if (op === 'delete') steps.push({ kind: 'delete', block: a[i++] });
      else steps.push({ kind: 'insert', block: b[j++] });
    }
  }
  return steps;
}

export function alignSteps(a: readonly QuoinBlock[], b: readonly QuoinBlock[], byId: boolean): Step[] {
  const ops = byId ? diffSequences(a.map(idOf), b.map(idOf)) : diffSequences(a, b, sameContent);
  return stepsOf(ops, a, b);
}

/** The blocks deleted where an insertion of their id shows they moved, by id. */
export function movedOrigins(steps: readonly Step[]): ReadonlyMap<string, QuoinBlock> {
  const deleted = new Map<string, QuoinBlock>();
  for (const step of steps) if (step.kind === 'delete') deleted.set(step.block.id, step.block);
  const moved = new Map<string, QuoinBlock>();
  for (const step of steps) {
    const origin = step.kind === 'insert' && deleted.get(step.block.id);
    if (origin) moved.set(step.block.id, origin);
  }
  return moved;
}
