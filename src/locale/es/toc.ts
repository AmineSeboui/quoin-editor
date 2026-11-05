import type { TocLabels } from '../../extensions/toc/toc-labels';

/** Every string the table of contents feature shows or speaks, in Spanish. */
export const esTocLabels: TocLabels = {
  tableOfContents: 'Índice',
  tableOfContentsNumbered: (n) => `Índice ${n}`,
  tableOfContentsDescription: 'Enlaces a los títulos de la página',
  noHeadings: 'Añade títulos para construir el índice',
};
