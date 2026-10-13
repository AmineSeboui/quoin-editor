import { indexOfBlock, replaceBlocks } from '../model/doc';
import { inlineLength, replaceInline, sliceInline } from '../model/inline';
import type { EngineBlock } from '../model/types';
import { StepError, type CreatedBlock, type PosMap, type Step } from './step';
import { requireBlock, requireRange, requireRegion, withRegion } from './step-access';

export function splitBlockStep(block: string, region: string, offset: number, created: CreatedBlock): Step {
  const map: PosMap = (pos, assoc = 1) => {
    if (pos.block !== block || pos.region !== region) return pos;
    if (pos.offset < offset || (pos.offset === offset && assoc === -1)) return pos;
    return { block: created.id, region: created.region, offset: pos.offset - offset };
  };
  return Object.freeze<Step>({
    stepType: 'splitBlock',
    apply(doc) {
      const target = requireBlock(doc, block);
      const inline = requireRange(target, region, offset, offset);
      if (doc.index.has(created.id)) throw new StepError(`block "${created.id}" is already in the document`);
      const tail: EngineBlock = {
        id: created.id,
        type: created.type,
        indent: created.indent,
        attrs: created.attrs,
        regions: { ...created.regions, [created.region]: sliceInline(inline, offset, inlineLength(inline)) },
      };
      const head = withRegion(target, region, sliceInline(inline, 0, offset));
      return { doc: replaceBlocks(doc, indexOfBlock(doc, block), 1, [head, tail]), map };
    },
    invert: () => joinBlocksStep(block, region, created.id, created.region),
    toJSON: () => ({ stepType: 'splitBlock', block, region, offset, created }),
  });
}

export function joinBlocksStep(target: string, targetRegion: string, source: string, sourceRegion: string): Step {
  return Object.freeze<Step>({
    stepType: 'joinBlocks',
    apply(doc) {
      const first = requireBlock(doc, target);
      const second = requireBlock(doc, source);
      const index = indexOfBlock(doc, target);
      if (indexOfBlock(doc, source) !== index + 1) throw new StepError(`block "${source}" does not follow "${target}"`);
      const head = requireRegion(first, targetRegion);
      const length = inlineLength(head);
      const merged = replaceInline(head, length, length, requireRegion(second, sourceRegion));
      const map: PosMap = (pos) =>
        pos.block === source
          ? { block: target, region: targetRegion, offset: length + (pos.region === sourceRegion ? pos.offset : 0) }
          : pos;
      return { doc: replaceBlocks(doc, index, 2, [withRegion(first, targetRegion, merged)]), map };
    },
    invert(before) {
      const { id, type, attrs, indent, regions } = requireBlock(before, source);
      const length = inlineLength(requireRegion(requireBlock(before, target), targetRegion));
      // Keeping the source region's key holds its place in the key order; the split overwrites its value with the tail.
      const created = { id, type, attrs, indent, region: sourceRegion, regions };
      return splitBlockStep(target, targetRegion, length, created);
    },
    toJSON: () => ({ stepType: 'joinBlocks', target, targetRegion, source, sourceRegion }),
  });
}
