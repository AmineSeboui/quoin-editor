import { TableOfContents } from 'lucide-react';
import { insertBlockToWrite } from '../../blocks/insert-blocks';
import type { SlashItem } from '../ui-types';
import type { TocLabels } from './toc-labels';

/** Table of contents, which inserts one and goes on in a new line under it. */
export const tocSlashItem = (labels: TocLabels): SlashItem => ({
  id: 'table-of-contents',
  title: labels.tableOfContents,
  description: labels.tableOfContentsDescription,
  group: 'advanced',
  icon: TableOfContents,
  keywords: ['toc', 'contents', 'outline', 'headings', 'index'],
  command: () => insertBlockToWrite({ type: 'TOC' }, false),
});
