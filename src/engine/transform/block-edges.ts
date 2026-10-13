import { compareRegionNames } from '../model/compare';
import { inlineLength } from '../model/inline';
import type { EngineBlock, Pos } from '../model/types';

function orderedRegions(block: EngineBlock): string[] {
  return Object.keys(block.regions).sort(compareRegionNames);
}

export function firstRegion(block: EngineBlock): string | null {
  return orderedRegions(block)[0] ?? null;
}

export function blockStart(block: EngineBlock): Pos {
  return { block: block.id, region: firstRegion(block) ?? '', offset: 0 };
}

export function blockEnd(block: EngineBlock): Pos {
  const region = orderedRegions(block).at(-1);
  return {
    block: block.id,
    region: region ?? '',
    offset: region === undefined ? 0 : inlineLength(block.regions[region]),
  };
}

export function clampPos(block: EngineBlock, pos: Pos): Pos {
  if (!Object.hasOwn(block.regions, pos.region)) return blockStart(block);
  const length = inlineLength(block.regions[pos.region]);
  return pos.offset > length ? { ...pos, offset: length } : pos;
}
