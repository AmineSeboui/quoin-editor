import { createDoc, replaceBlocks, updateBlock } from '../model/doc';
import type { EngineBlock } from '../model/types';
import { blockEnd, blockStart, clampPos } from './block-edges';
import { identityMap, StepError, type PosMap, type Step } from './step';
import { requireBlock, requireSpan } from './step-access';

export function insertBlocksStep(index: number, blocks: readonly EngineBlock[]): Step {
  return Object.freeze<Step>({
    stepType: 'insertBlocks',
    apply(doc) {
      requireSpan(index, 0, doc.blocks.length);
      const ids = new Set<string>();
      for (const { id } of blocks) {
        if (doc.index.has(id) || ids.has(id)) throw new StepError(`block "${id}" is already in the document`);
        ids.add(id);
      }
      return { doc: replaceBlocks(doc, index, 0, blocks), map: identityMap };
    },
    invert: () => removeBlocksStep(index, blocks.length),
    toJSON: () => ({ stepType: 'insertBlocks', index, blocks }),
  });
}

export function removeBlocksStep(index: number, count: number): Step {
  return Object.freeze<Step>({
    stepType: 'removeBlocks',
    apply(doc) {
      requireSpan(index, count, doc.blocks.length);
      const removed = new Set(doc.blocks.slice(index, index + count).map((block) => block.id));
      const preceding: EngineBlock | undefined = doc.blocks[index - 1];
      const following: EngineBlock | undefined = doc.blocks[index + count];
      const map: PosMap = (pos, assoc = 1) => {
        if (!removed.has(pos.block)) return pos;
        const before = preceding && blockEnd(preceding);
        const after = following && blockStart(following);
        return (assoc === -1 ? (before ?? after) : (after ?? before)) ?? pos;
      };
      return { doc: replaceBlocks(doc, index, count, []), map };
    },
    invert: (before) => insertBlocksStep(index, before.blocks.slice(index, index + count)),
    toJSON: () => ({ stepType: 'removeBlocks', index, count }),
  });
}

export function moveBlocksStep(from: number, count: number, to: number): Step {
  return Object.freeze<Step>({
    stepType: 'moveBlocks',
    apply(doc) {
      requireSpan(from, count, doc.blocks.length);
      requireSpan(to, count, doc.blocks.length);
      const moved = doc.blocks.slice(from, from + count);
      const rest = [...doc.blocks.slice(0, from), ...doc.blocks.slice(from + count)];
      return { doc: createDoc([...rest.slice(0, to), ...moved, ...rest.slice(to)]), map: identityMap };
    },
    invert: () => moveBlocksStep(to, count, from),
    toJSON: () => ({ stepType: 'moveBlocks', from, count, to }),
  });
}

export function replaceBlockStep(block: EngineBlock): Step {
  const map: PosMap = (pos) => (pos.block === block.id ? clampPos(block, pos) : pos);
  return Object.freeze<Step>({
    stepType: 'replaceBlock',
    apply(doc) {
      requireBlock(doc, block.id);
      return { doc: updateBlock(doc, block.id, () => block), map };
    },
    invert: (before) => replaceBlockStep(requireBlock(before, block.id)),
    toJSON: () => ({ stepType: 'replaceBlock', block }),
  });
}
