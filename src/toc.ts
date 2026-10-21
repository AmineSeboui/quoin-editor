'use client';

// The whole main entry, for the reason src/table.ts gives.
import './index';

export { tocExtension, type TocOptions } from './extensions/toc/toc-extension';
export { englishTocLabels, type TocLabels } from './extensions/toc/toc-labels';
export { headings, type TocHeading } from './extensions/toc/headings';
