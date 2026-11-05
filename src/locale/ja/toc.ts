import type { TocLabels } from '../../extensions/toc/toc-labels';

/** Every string the table of contents feature shows or speaks, in Japanese. */
export const jaTocLabels: TocLabels = {
  tableOfContents: '目次',
  tableOfContentsNumbered: (n) => `目次 ${n}`,
  tableOfContentsDescription: 'ページの見出しへのリンク',
  noHeadings: '見出しを追加すると目次ができます',
};
