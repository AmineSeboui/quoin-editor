/** A block in drawing order, and whether only the older version has it and whether it owns the deeper blocks after it. */
export type Placed<T> = { readonly item: T; readonly older: boolean; readonly owner: boolean; readonly indent: number };

// A block of the run goes in front with the block it is nested under, and a kept block goes in front whatever it is
// nested under, so an older block nested under a kept one stays under it.
function inFront<T>(run: readonly Placed<T>[]): boolean[] {
  const parents: { indent: number; front: boolean }[] = [];
  return run.map((block) => {
    while (parents.length > 0 && parents[parents.length - 1].indent >= block.indent) parents.pop();
    const front = !block.older || (parents[parents.length - 1]?.front ?? false);
    parents.push({ indent: block.indent, front });
    return front;
  });
}

/**
 * Moves the blocks nested after an older list item or toggle that are not older themselves in front of it, with the
 * older blocks nested under them, so a removed or moved-away owner holds only the blocks removed with it, and a kept
 * block never reads as removed or hides in it.
 */
export function withoutAdoptedBlocks<T>(placed: readonly Placed<T>[]): T[] {
  const out = [...placed];
  for (let at = out.length - 1; at >= 0; at--) {
    const owner = out[at];
    if (!owner.older || !owner.owner) continue;
    let end = at + 1;
    while (end < out.length && out[end].indent > owner.indent) end++;
    const run = out.slice(at + 1, end);
    const front = inFront(run);
    if (front.some(Boolean)) {
      out.splice(at, end - at, ...run.filter((_, i) => front[i]), owner, ...run.filter((_, i) => !front[i]));
    }
  }
  return out.map(({ item }) => item);
}
