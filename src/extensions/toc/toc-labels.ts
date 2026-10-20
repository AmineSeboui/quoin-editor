/** Every string the table of contents feature shows or speaks. */
export type TocLabels = {
  /** The slash command, and the name of a table of contents and of its navigation. */
  tableOfContents: string;
  tableOfContentsDescription: string;
  /** What a table of contents shows while the document has no headings. */
  noHeadings: string;
};

export const englishTocLabels: TocLabels = {
  tableOfContents: 'Table of contents',
  tableOfContentsDescription: 'Links to the headings of the page',
  noHeadings: 'Add headings to build the table of contents',
};

/** The English labels with the host's overrides on top. A key left out, or passed as undefined, stays English. */
export function resolveTocLabels(overrides?: Partial<TocLabels>): TocLabels {
  const given = Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishTocLabels : { ...englishTocLabels, ...Object.fromEntries(given) };
}
