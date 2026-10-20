export type SuggestionSection<T> = { label: string | null; entries: { item: T; index: number }[] };

/**
 * The items in sections, a section for each group in the order its first item comes, and each item's place in that
 * order, which is the order the arrows walk.
 */
export function groupItems<T>(items: readonly T[], groupOf?: (item: T) => string | null): SuggestionSection<T>[] {
  const sections: SuggestionSection<T>[] = [];
  const byLabel = new Map<string | null, SuggestionSection<T>>();
  for (const item of items) {
    const label = groupOf?.(item) ?? null;
    let section = byLabel.get(label);
    if (section === undefined) {
      section = { label, entries: [] };
      byLabel.set(label, section);
      sections.push(section);
    }
    section.entries.push({ item, index: -1 });
  }
  let index = 0;
  for (const entry of sections.flatMap((section) => section.entries)) entry.index = index++;
  return sections;
}
