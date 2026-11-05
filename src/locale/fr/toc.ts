import type { TocLabels } from '../../extensions/toc/toc-labels';

/** Every string the table of contents feature shows or speaks, in French. */
export const frTocLabels: TocLabels = {
  tableOfContents: 'Sommaire',
  tableOfContentsNumbered: (n) => `Sommaire ${n}`,
  tableOfContentsDescription: 'Liens vers les titres de la page',
  noHeadings: 'Ajoutez des titres pour construire le sommaire',
};
