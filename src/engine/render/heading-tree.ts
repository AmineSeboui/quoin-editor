/** A heading and the headings under it, down to the next one of its level or above. */
export type HeadingNode<T> = { readonly heading: T; readonly children: HeadingNode<T>[] };

/** Nests each heading under the nearest one above it of a lower level, so a skipped level nests one deep. */
export function nestHeadings<T extends { readonly level: number }>(headings: readonly T[]): HeadingNode<T>[] {
  const roots: HeadingNode<T>[] = [];
  const open: HeadingNode<T>[] = [];
  for (const heading of headings) {
    while (open.length > 0 && open[open.length - 1].heading.level >= heading.level) open.pop();
    const node: HeadingNode<T> = { heading, children: [] };
    (open[open.length - 1]?.children ?? roots).push(node);
    open.push(node);
  }
  return roots;
}
