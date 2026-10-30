import { createBlockCodec } from '../blocks/codec';
import type { QuoinBlock } from '../model/quoin-block';
import { createSchema } from '../schema/create-schema';
import type { Schema } from '../schema/types';
import { changeBetween, sameContent, type BlockChange } from './block-change';
import { alignSteps, movedOrigins } from './diff-steps';
import { refineSteps, type Side } from './refine-gaps';

/** A moved block is deleted where it was and inserted where it went, its insertion holding its `change` if edited. */
export type BlockDiff =
  | { op: 'equal'; block: QuoinBlock }
  | { op: 'insert'; block: QuoinBlock; moved?: boolean; change?: BlockChange }
  | { op: 'delete'; block: QuoinBlock; moved?: boolean }
  | BlockChange;

const idOf = (block: QuoinBlock) => block.id;

function idsMostlyMatch(a: readonly QuoinBlock[], b: readonly QuoinBlock[]): boolean {
  const known = new Set(b.map(idOf));
  const matching = a.filter((block) => known.has(block.id)).length;
  return matching * 2 >= Math.min(a.length, b.length);
}

/**
 * A 0.4 block that holds several nodes is diffed as the pieces the editor splits it into, so an edit shows in one
 * piece only, and the diff then carries those pieces. Blocks that are the same on both sides are never split.
 */
export function diffBlocks(
  a: readonly QuoinBlock[],
  b: readonly QuoinBlock[],
  options: { schema?: Schema } = {},
): BlockDiff[] {
  const schema = options.schema ?? createSchema();
  const codec = createBlockCodec(schema);
  const byId = idsMostlyMatch(a, b);
  const taken = { before: new Set(a.map(idOf)), after: new Set(b.map(idOf)) };
  const expand = (block: QuoinBlock, side: Side) => {
    const pieces = codec.toEngineBlocks(block, taken[side]);
    return pieces.length === 1 ? [block] : pieces.map(codec.toQuoin);
  };
  const steps = refineSteps(alignSteps(a, b, byId), expand, byId);
  const moved = byId ? movedOrigins(steps) : new Map<string, QuoinBlock>();
  const change = (before: QuoinBlock, after: QuoinBlock) => changeBetween(before, after, schema, codec.context);
  return steps.map((step): BlockDiff => {
    if (step.kind === 'pair') {
      const { before, after } = step;
      return sameContent(before, after) ? { op: 'equal', block: after } : change(before, after);
    }
    const { kind, block } = step;
    const origin = moved.get(block.id);
    if (!origin) return { op: kind, block };
    return kind === 'insert' && !sameContent(origin, block)
      ? { op: kind, block, moved: true, change: change(origin, block) }
      : { op: kind, block, moved: true };
  });
}
