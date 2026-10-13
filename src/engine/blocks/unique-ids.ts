import type { EngineBlock } from '../model/types';

function freeId(preferred: string, taken: ReadonlySet<string>): string {
  if (!taken.has(preferred)) return preferred;
  let suffix = 2;
  while (taken.has(`${preferred}-${suffix}`)) suffix++;
  return `${preferred}-${suffix}`;
}

// A fresh id that is already in use moves on to its first free suffix, so an id source that repeats itself still
// leaves every id unique.
export function withUniqueIds(blocks: readonly EngineBlock[], newId: () => string): EngineBlock[] {
  const taken = new Set(blocks.map((block) => block.id));
  const placed = new Set<string>();
  return blocks.map((block) => {
    if (!placed.has(block.id)) {
      placed.add(block.id);
      return block;
    }
    const id = freeId(newId(), taken);
    taken.add(id);
    return { ...block, id };
  });
}
