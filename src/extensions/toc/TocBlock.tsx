'use client';

import { useMemo, useRef } from 'react';
import { useNodeKeys } from '../../blocks/void/use-node-keys';
import { nestHeadings } from '../../engine/render/heading-tree';
import type { BlockRenderProps } from '../../view';
import { useReadOnly } from '../../view/react/use-read-only';
import { tocHandlers } from './toc-handlers';
import type { TocLabels } from './toc-labels';
import { TocList } from './TocList';
import { useTocHeadings } from './use-toc-headings';

type TocBlockProps = BlockRenderProps & { labels: TocLabels };

/**
 * A table of contents: the headings of the document as links nested by level, kept up to date as they change. On an
 * editable canvas, Enter while the block is selected as a whole moves focus to its first entry.
 */
export function TocBlock({ block, controller, labels }: TocBlockProps) {
  const readOnly = useReadOnly(controller);
  const listed = useTocHeadings(controller);
  const nested = useMemo(() => nestHeadings(listed), [listed]);
  const root = useRef<HTMLElement>(null);
  const keys = useMemo(() => ({ enter: () => root.current?.querySelector<HTMLElement>('a[href]')?.focus() }), []);
  useNodeKeys(controller, block.id, !readOnly, listed.length > 0, root, keys);

  return (
    <nav
      ref={root}
      aria-label={labels.tableOfContents}
      contentEditable={false}
      className="quoin-toc"
      {...tocHandlers(controller, block.id, root, readOnly)}
    >
      {nested.length === 0 ? (
        <p className="quoin-toc-empty">{labels.noHeadings}</p>
      ) : (
        <TocList nodes={nested} inTabOrder={readOnly} />
      )}
    </nav>
  );
}
