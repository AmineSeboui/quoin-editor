/** A block in drawing order, and whether only the older version has it and whether it owns the deeper blocks after it. */
export type Placed<T> = { readonly item: T; readonly older: boolean; readonly owner: boolean; readonly indent: number };

/**
 * Moves the blocks nested after an older list item or toggle that are not older themselves in front of it, so a removed
 * or moved-away owner holds only the blocks removed with it, and a kept block never reads as removed or hides in it.
 */
export function withoutAdoptedBlocks<T>(placed: readonly Placed<T>[]): T[] {
  const out = [...placed];
  for (let at = out.length - 1; at >= 0; at--) {
    const owner = out[at];
    if (!owner.older || !owner.owner) continue;
    let end = at + 1;
    while (end < out.length && out[end].indent > owner.indent) end++;
    const run = out.slice(at + 1, end);
    const kept = run.filter((block) => !block.older);
    if (kept.length > 0) out.splice(at, end - at, ...kept, owner, ...run.filter((block) => block.older));
  }
  return out.map(({ item }) => item);
}
