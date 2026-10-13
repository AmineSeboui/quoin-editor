import type { EngineBlock } from '../model/types';

export function freshBlocks(pieces: readonly EngineBlock[], baseIndent: number, makeId: () => string): EngineBlock[] {
  const least = pieces.reduce((smallest, block) => Math.min(smallest, block.indent), Infinity);
  return pieces.map((block) => ({ ...block, id: makeId(), indent: block.indent - least + baseIndent }));
}
