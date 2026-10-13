import { blockById } from '../model/doc';
import type { EngineDoc } from '../model/types';
import { blockStart, clampPos } from './block-edges';
import type { PosMap, Step } from './step';

export function replaceDocStep(next: EngineDoc): Step {
  return Object.freeze<Step>({
    stepType: 'replaceDoc',
    apply(doc) {
      const map: PosMap = (pos) => {
        const survivor = blockById(next, pos.block);
        if (survivor !== undefined) return clampPos(survivor, pos);
        const nearest = next.blocks[Math.min(doc.index.get(pos.block) ?? 0, next.blocks.length - 1)];
        return nearest === undefined ? pos : blockStart(nearest);
      };
      return { doc: next, map };
    },
    invert: (before) => replaceDocStep(before),
    toJSON: () => ({ stepType: 'replaceDoc', blocks: next.blocks }),
  });
}
