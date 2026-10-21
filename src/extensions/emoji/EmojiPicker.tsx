'use client';

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Input } from '../../ui/input';
import { isComposing } from './composing-key';
import type { EmojiLabels } from './emoji-labels';
import { EmojiGrids } from './EmojiGrids';
import { pickerLayout } from './picker-layout';
import { useEmojiData } from './use-emoji-data';

type Props = { labels: EmojiLabels; onPick(emoji: string): void };

const ACTIVE_CELL = '[role="gridcell"][tabindex="0"]';

/**
 * A search field over grids of every emoji, one for each group, or one of the emoji the search finds, best first. Tab
 * moves between the field and the grids, ArrowDown in the field goes to the grids and Enter there picks the first
 * match. The dataset loads the first time a picker mounts, and again in a picker mounted after a load that failed.
 */
export function EmojiPicker({ labels, onPick }: Props) {
  const data = useEmojiData();
  const [query, setQuery] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const grids = useRef<HTMLDivElement>(null);
  const searching = query.trim() !== '';
  const layout = useMemo(
    () => (typeof data === 'string' ? null : pickerLayout(data.searchEmoji(query), searching, labels)),
    [data, query, searching, labels],
  );
  const shown = layout !== null && layout.sections.length > 0;
  const status = data === 'loading' ? labels.loading : data === 'failed' ? labels.loadFailed : shown ? '' : labels.noMatches;
  const focusGrids = () => grids.current?.querySelector<HTMLElement>(ACTIVE_CELL)?.focus();

  // Tab stays within the picker: the popover it sits in is drawn at the end of the page, where Tab would leave the page.
  // It goes no further either, where Radix would send focus on the last tabbable cell round to the field.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || isComposing(event.nativeEvent) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.target === field.current) focusGrids();
    else field.current?.focus();
  };
  const onFieldKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (isComposing(event.nativeEvent)) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusGrids();
    } else if (event.key === 'Enter' && searching && shown) {
      event.preventDefault();
      onPick(layout.rows[0][0].emoji);
    }
  };

  return (
    <div className="flex flex-col gap-1" onKeyDown={onKeyDown}>
      <Input
        ref={field}
        className="h-8"
        aria-label={labels.searchEmoji}
        placeholder={labels.searchEmoji}
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onFieldKeyDown}
      />
      <p role="status" className="px-1 text-sm text-muted-foreground empty:hidden">
        {status}
      </p>
      {shown && <EmojiGrids ref={grids} layout={layout} onPick={onPick} />}
    </div>
  );
}
