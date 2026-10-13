import { blockById } from '../model/doc';
import { inlineLength } from '../model/inline';
import type { EngineBlock, EngineDoc, Inline } from '../model/types';
import { StepError } from './step';

export function requireBlock(doc: EngineDoc, id: string): EngineBlock {
  const block = blockById(doc, id);
  if (block === undefined) throw new StepError(`no block "${id}"`);
  return block;
}

export function requireRegion(block: EngineBlock, region: string): Inline {
  if (!Object.hasOwn(block.regions, region)) throw new StepError(`block "${block.id}" has no region "${region}"`);
  return block.regions[region];
}

export function requireRange(block: EngineBlock, region: string, from: number, to: number): Inline {
  const inline = requireRegion(block, region);
  const length = inlineLength(inline);
  if (!(Number.isInteger(from) && Number.isInteger(to) && from >= 0 && from <= to && to <= length)) {
    throw new StepError(`range ${from} to ${to} is outside 0 to ${length} in "${block.id}" ${region}`);
  }
  return inline;
}

export function requireSpan(start: number, count: number, length: number): void {
  if (!(Number.isInteger(start) && Number.isInteger(count) && start >= 0 && count >= 0 && start + count <= length)) {
    throw new StepError(`blocks ${start} to ${start + count} are outside 0 to ${length}`);
  }
}

export function withRegion(block: EngineBlock, region: string, inline: Inline): EngineBlock {
  return { ...block, regions: { ...block.regions, [region]: inline } };
}
