import { blockById } from '../model/doc';
import { inlineText } from '../model/inline';
import type { EngineDoc } from '../model/types';
import { blockStart, clampPos } from './block-edges';
import { mapTextChange } from './map-text-change';
import type { PosMap, Step } from './step';

export function replaceDocStep(next: EngineDoc): Step {
  return Object.freeze<Step>({
    stepType: 'replaceDoc',
    apply(doc) {
      const map: PosMap = (pos, assoc = 1) => {
        const survivor = blockById(next, pos.block);
        if (survivor !== undefined) {
          const before = inlineText(blockById(doc, pos.block)?.regions[pos.region] ?? []);
          const offset = mapTextChange(before, inlineText(survivor.regions[pos.region] ?? []), pos.offset, assoc);
          return clampPos(survivor, offset === pos.offset ? pos : { ...pos, offset });
        }
        const nearest = next.blocks[Math.min(doc.index.get(pos.block) ?? 0, next.blocks.length - 1)];
        return nearest === undefined ? pos : blockStart(nearest);
      };
      return { doc: next, map };
    },
    invert: (before) => replaceDocStep(before),
    toJSON: () => ({ stepType: 'replaceDoc', blocks: next.blocks }),
  });
}
