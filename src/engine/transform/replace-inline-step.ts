import { updateBlock } from '../model/doc';
import { inlineLength, replaceInline, sliceInline } from '../model/inline';
import type { Inline } from '../model/types';
import type { PosMap, Step } from './step';
import { requireBlock, requireRange, withRegion } from './step-access';

export function replaceInlineStep(block: string, region: string, from: number, to: number, slice: Inline): Step {
  const inserted = inlineLength(slice);
  const map: PosMap = (pos, assoc = 1) => {
    if (pos.block !== block || pos.region !== region || pos.offset < from) return pos;
    if (pos.offset > to) return { ...pos, offset: pos.offset + inserted - (to - from) };
    return { ...pos, offset: assoc === -1 ? from : from + inserted };
  };
  return Object.freeze<Step>({
    stepType: 'replaceInline',
    apply(doc) {
      const inline = requireRange(requireBlock(doc, block), region, from, to);
      const next = updateBlock(doc, block, (b) => withRegion(b, region, replaceInline(inline, from, to, slice)));
      return { doc: next, map };
    },
    invert(before) {
      const inline = requireRange(requireBlock(before, block), region, from, to);
      return replaceInlineStep(block, region, from, from + inserted, sliceInline(inline, from, to));
    },
    toJSON: () => ({ stepType: 'replaceInline', block, region, from, to, slice }),
  });
}
