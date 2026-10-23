import { blockById } from '../model/doc';
import { inlineText } from '../model/inline';
import type { EngineDoc } from '../model/types';
import { blockStart, clampPos } from './block-edges';
import { mapTextChange, type OffsetMap } from './map-text-change';
import type { PosMap, Step } from './step';

export function replaceDocStep(next: EngineDoc): Step {
  return Object.freeze<Step>({
    stepType: 'replaceDoc',
    apply(doc) {
      const regionMaps = new Map<string, OffsetMap>();
      const map: PosMap = (pos, assoc = 1) => {
        const { block, region } = pos;
        const survivor = blockById(next, block);
        if (survivor !== undefined) {
          const key = JSON.stringify([block, region]);
          let regionMap = regionMaps.get(key);
          if (regionMap === undefined) {
            const before = inlineText(blockById(doc, block)?.regions[region] ?? []);
            regionMap = mapTextChange(before, inlineText(survivor.regions[region] ?? []));
            regionMaps.set(key, regionMap);
          }
          const offset = regionMap(pos.offset, assoc);
          return clampPos(survivor, offset === pos.offset ? pos : { ...pos, offset });
        }
        const nearest = next.blocks[Math.min(doc.index.get(block) ?? 0, next.blocks.length - 1)];
        return nearest === undefined ? pos : blockStart(nearest);
      };
      return { doc: next, map };
    },
    invert: (before) => replaceDocStep(before),
    toJSON: () => ({ stepType: 'replaceDoc', blocks: next.blocks }),
  });
}
