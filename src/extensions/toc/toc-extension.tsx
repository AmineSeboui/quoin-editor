'use client';

import { defineExtension, type Extension } from '../../engine';
import type { BlockRenderProps } from '../../view';
import type { ExtensionUI } from '../ui-types';
import { TocBlock } from './TocBlock';
import { resolveTocLabels, type TocLabels } from './toc-labels';
import { tocSlashItem } from './toc-slash-item';

export type TocOptions = {
  /** Every string the feature shows or speaks, English by default. A key left out stays English. */
  labels?: Partial<TocLabels>;
};

/**
 * Table of contents: TOC blocks drawn as the headings of the document, linked and nested by level, and kept up to date
 * as they are written, and a slash command that inserts one.
 */
export function tocExtension(options: TocOptions = {}): Extension {
  const labels = resolveTocLabels(options.labels);
  const TocRenderer = (props: BlockRenderProps) => <TocBlock {...props} labels={labels} />;
  const ui: ExtensionUI = { slashItems: [tocSlashItem(labels)], renderers: { TOC: TocRenderer } };
  return defineExtension({ name: 'toc', ui });
}
