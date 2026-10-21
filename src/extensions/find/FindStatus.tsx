'use client';

import { useEffect, useState } from 'react';
import type { FindLabels } from './find-labels';
import type { FindState } from './find-state';

// Long enough that typing a query announces only the count it comes to rest on.
const ANNOUNCE_DELAY = 500;

export function statusText(labels: FindLabels, value: FindState): string {
  if (value.error !== null) return labels.invalidPattern;
  if (value.search.query === '') return '';
  if (value.matches.length === 0) return labels.noResults;
  return labels.matchCount(value.current + 1, value.matches.length, value.capped);
}

/** Which match is current of how many, or why there is none, and the same said once typing rests. */
export function FindStatus({ labels, value }: { labels: FindLabels; value: FindState }) {
  const text = statusText(labels, value);
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(text), ANNOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [text]);
  return (
    <>
      <span data-quoin-find-status="" className="text-muted-foreground min-w-16 text-xs whitespace-nowrap tabular-nums">
        {text}
      </span>
      <span data-quoin-find-announcer="" aria-live="polite" className="quoin-visually-hidden">
        {announced}
      </span>
    </>
  );
}
