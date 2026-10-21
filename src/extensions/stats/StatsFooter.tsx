'use client';

import type { ViewController } from '../../view';
import type { StatsLabels } from './stats-labels';
import { useEditorStats } from './use-editor-stats';

/** The share of the limit from which the count is a live region, so a screen reader hears it near the end. */
export const NEAR_LIMIT = 0.9;

type Props = { controller: ViewController; labels: StatsLabels; limit?: number };

/** The counts under the document, and the characters against the limit when there is one. */
export function StatsFooter({ controller, labels, limit }: Props) {
  const { characters, words, blocks } = useEditorStats(controller);
  const near = limit !== undefined && characters >= limit * NEAR_LIMIT;
  return (
    <div className="quoin-stats" data-quoin-stats="">
      <span>{labels.words(words)}</span>
      <span aria-live={near ? 'polite' : undefined} data-near-limit={near ? '' : undefined}>
        {limit === undefined ? labels.characters(characters) : labels.characterLimit(characters, limit)}
      </span>
      <span>{labels.blocks(blocks)}</span>
    </div>
  );
}
