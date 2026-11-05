import type { TocLabels } from '../../extensions/toc/toc-labels';

/** Every string the table of contents feature shows or speaks, in Simplified Chinese. */
export const zhTocLabels: TocLabels = {
  tableOfContents: '目录',
  tableOfContentsNumbered: (n) => `目录 ${n}`,
  tableOfContentsDescription: '指向本页标题的链接',
  noHeadings: '添加标题即可生成目录',
};
