import { updateBlock } from '../model/doc';
import { addMarkRange, removeMarkRange, replaceInline, sliceInline } from '../model/inline';
import type { Inline, Mark } from '../model/types';
import { identityMap, type Step } from './step';
import { requireBlock, requireRange, withRegion } from './step-access';

/** Puts back the marked content of a range of the same length, so no position of the document moves. */
export function restoreMarksStep(block: string, region: string, from: number, to: number, slice: Inline): Step {
  return Object.freeze<Step>({
    stepType: 'restoreMarks',
    apply(doc) {
      const inline = requireRange(requireBlock(doc, block), region, from, to);
      const next = updateBlock(doc, block, (b) => withRegion(b, region, replaceInline(inline, from, to, slice)));
      return { doc: next, map: identityMap };
    },
    invert(before) {
      const inline = requireBlock(before, block).regions[region];
      return restoreMarksStep(block, region, from, to, sliceInline(inline, from, to));
    },
    toJSON: () => ({ stepType: 'restoreMarks', block, region, from, to, slice }),
  });
}

type Target = { block: string; region: string; from: number; to: number };

function markStep(
  stepType: 'addMark' | 'removeMark',
  target: Target,
  mark: Mark | string,
  change: (inline: Inline) => Inline,
): Step {
  const { block, region, from, to } = target;
  return Object.freeze<Step>({
    stepType,
    apply(doc) {
      const inline = requireRange(requireBlock(doc, block), region, from, to);
      return { doc: updateBlock(doc, block, (b) => withRegion(b, region, change(inline))), map: identityMap };
    },
    invert(before) {
      const inline = requireRange(requireBlock(before, block), region, from, to);
      return restoreMarksStep(block, region, from, to, sliceInline(inline, from, to));
    },
    toJSON: () => ({ stepType, ...target, mark }),
  });
}

export function addMarkStep(block: string, region: string, from: number, to: number, mark: Mark): Step {
  return markStep('addMark', { block, region, from, to }, mark, (inline) => addMarkRange(inline, from, to, mark));
}

export function removeMarkStep(block: string, region: string, from: number, to: number, mark: Mark | string): Step {
  return markStep('removeMark', { block, region, from, to }, mark, (inline) =>
    removeMarkRange(inline, from, to, mark),
  );
}
