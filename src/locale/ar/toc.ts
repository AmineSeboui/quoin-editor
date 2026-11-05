import type { TocLabels } from '../../extensions/toc/toc-labels';

/** Every string the table of contents feature shows or speaks, in Arabic. */
export const arTocLabels: TocLabels = {
  tableOfContents: 'جدول المحتويات',
  tableOfContentsNumbered: (n) => `جدول المحتويات ${n}`,
  tableOfContentsDescription: 'روابط إلى عناوين الصفحة',
  noHeadings: 'أضف عناوين لبناء جدول المحتويات',
};
