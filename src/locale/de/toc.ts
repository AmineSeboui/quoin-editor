import type { TocLabels } from '../../extensions/toc/toc-labels';

/** Every string the table of contents feature shows or speaks, in German. */
export const deTocLabels: TocLabels = {
  tableOfContents: 'Inhaltsverzeichnis',
  tableOfContentsNumbered: (n) => `Inhaltsverzeichnis ${n}`,
  tableOfContentsDescription: 'Links zu den Überschriften der Seite',
  noHeadings: 'Fügen Sie Überschriften hinzu, um das Inhaltsverzeichnis aufzubauen',
};
