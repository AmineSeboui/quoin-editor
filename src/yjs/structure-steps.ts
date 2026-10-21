import { sameValue } from '../engine/model/same-value';
import type { EngineBlock, EngineDoc } from '../engine/model/types';
import { insertBlocksStep, moveBlocksStep, removeBlocksStep, replaceBlockStep } from '../engine/transform/block-steps';
import type { Step } from '../engine/transform/step';
import { fromYBlock, idOf, type YBlock } from './doc-shape';

/**
 * The steps that turn the order of `doc` into the order of the shared blocks `kept`: removals, moves of the blocks
 * both hold, then insertions. A block inserted in this change under an id the editor holds is a moved copy, so its
 * content replaces the editor's.
 */
export function structureSteps(doc: EngineDoc, kept: readonly YBlock[], inserted: ReadonlySet<YBlock>): Step[] {
  const steps: Step[] = [];
  let current = doc;
  const push = (step: Step) => {
    steps.push(step);
    current = step.apply(current).doc;
  };
  const ids = kept.map(idOf);
  const wanted = new Set(ids);
  for (let end = current.blocks.length; end > 0; ) {
    if (wanted.has(current.blocks[end - 1].id)) end -= 1;
    else {
      let start = end - 1;
      while (start > 0 && !wanted.has(current.blocks[start - 1].id)) start -= 1;
      push(removeBlocksStep(start, end - start));
      end = start;
    }
  }
  const held = new Set(current.blocks.map((block) => block.id));
  ids
    .filter((id) => held.has(id))
    .forEach((id, i) => {
      const at = current.index.get(id)!;
      if (at !== i) push(moveBlocksStep(at, 1, i));
    });
  for (let i = 0; i < kept.length; ) {
    if (held.has(ids[i])) {
      i += 1;
      continue;
    }
    const run: EngineBlock[] = [];
    for (let j = i; j < kept.length && !held.has(ids[j]); j += 1) run.push(fromYBlock(kept[j]));
    push(insertBlocksStep(i, run));
    i += run.length;
  }
  for (const block of kept) {
    if (!inserted.has(block) || !held.has(idOf(block))) continue;
    const copy = fromYBlock(block);
    if (!sameValue(copy, current.blocks[current.index.get(copy.id)!])) push(replaceBlockStep(copy));
  }
  return steps;
}
