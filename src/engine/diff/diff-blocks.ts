import { createBlockCodec } from '../blocks/codec';
import type { QuoinBlock } from '../model/quoin-block';
import { createSchema } from '../schema/create-schema';
import type { Schema } from '../schema/types';
import { changeBetween, sameContent, type BlockChange } from './block-change';
import { diffSequences, type DiffOp } from './myers';

export type BlockDiff =
  | { op: 'equal'; block: QuoinBlock }
  | { op: 'insert'; block: QuoinBlock; moved?: boolean }
  | { op: 'delete'; block: QuoinBlock; moved?: boolean }
  | BlockChange;

type Step =
  | { kind: 'pair'; before: QuoinBlock; after: QuoinBlock }
  | { kind: 'delete'; block: QuoinBlock }
  | { kind: 'insert'; block: QuoinBlock };

const idOf = (block: QuoinBlock) => block.id;

function idsMostlyMatch(a: readonly QuoinBlock[], b: readonly QuoinBlock[]): boolean {
  const known = new Set(b.map(idOf));
  const matching = a.filter((block) => known.has(block.id)).length;
  return matching * 2 >= Math.min(a.length, b.length);
}

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

function movedIds(steps: readonly Step[]): ReadonlySet<string> {
  const deleted = new Set<string>();
  for (const step of steps) if (step.kind === 'delete') deleted.add(step.block.id);
  const moved = new Set<string>();
  for (const step of steps) if (step.kind === 'insert' && deleted.has(step.block.id)) moved.add(step.block.id);
  return moved;
}

export function diffBlocks(
  a: readonly QuoinBlock[],
  b: readonly QuoinBlock[],
  options: { schema?: Schema } = {},
): BlockDiff[] {
  const schema = options.schema ?? createSchema();
  const { context } = createBlockCodec(schema);
  const byId = idsMostlyMatch(a, b);
  const steps = stepsOf(byId ? diffSequences(a.map(idOf), b.map(idOf)) : diffSequences(a, b, sameContent), a, b);
  const moved = byId ? movedIds(steps) : new Set<string>();
  return steps.map((step): BlockDiff => {
    if (step.kind === 'pair') {
      return sameContent(step.before, step.after)
        ? { op: 'equal', block: step.after }
        : changeBetween(step.before, step.after, schema, context);
    }
    const { kind, block } = step;
    return moved.has(block.id) ? { op: kind, block, moved: true } : { op: kind, block };
  });
}
