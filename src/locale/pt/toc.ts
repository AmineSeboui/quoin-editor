import type { TocLabels } from '../../extensions/toc/toc-labels';

/** Every string the table of contents feature shows or speaks, in Portuguese. */
export const ptTocLabels: TocLabels = {
  tableOfContents: 'Sumário',
  tableOfContentsNumbered: (n) => `Sumário ${n}`,
  tableOfContentsDescription: 'Links para os títulos da página',
  noHeadings: 'Adicione títulos para montar o sumário',
};
