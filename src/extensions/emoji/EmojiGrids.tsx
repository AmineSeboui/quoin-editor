'use client';

import { forwardRef, memo, useId, useState, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react';
import type { Emoji } from '../../emoji/emoji-types';
import { cn } from '../../ui/cn';
import { FOCUS_RING } from '../../ui/focus';
import { isComposing } from './composing-key';
import { emojiName } from './emoji-name';
import { gridMove, type GridCell } from './grid-moves';
import type { PickerLayout } from './picker-layout';

type Props = { layout: PickerLayout; onPick(emoji: string): void };

const CELL = cn(
  'flex size-8 shrink-0 cursor-default items-center justify-center rounded-sm text-xl hover:bg-accent',
  FOCUS_RING,
);
const HEADING = 'px-1 pt-2 pb-1 text-xs font-medium text-muted-foreground';
const FIRST: GridCell = { row: 0, col: 0 };

const cellId = (baseId: string, row: number, col: number) => `${baseId}-cell-${row}-${col}`;

const emojiAt = (target: EventTarget | null): string | null =>
  target instanceof Element ? (target.closest('[data-emoji]')?.getAttribute('data-emoji') ?? null) : null;

type RowProps = { baseId: string; row: number; emoji: readonly Emoji[]; activeCol: number | null };

// A row draws again only when its cells or its active cell change, so a move redraws the two rows it touches.
const EmojiRow = memo(function EmojiRow({ baseId, row, emoji, activeCol }: RowProps) {
  return (
    <div role="row" className="flex">
      {emoji.map((cell, col) => (
        <div
          key={cell.emoji}
          role="gridcell"
          id={cellId(baseId, row, col)}
          tabIndex={col === activeCol ? 0 : -1}
          aria-label={emojiName(cell)}
          data-emoji={cell.emoji}
          className={CELL}
        >
          <span aria-hidden="true">{cell.emoji}</span>
        </div>
      ))}
    </div>
  );
});

/**
 * The grids of the picker, which share one tab stop among their cells. The arrows, Home and End move it, from one grid
 * on into the next, and Enter or a click picks the emoji of a cell.
 */
export const EmojiGrids = forwardRef<HTMLDivElement, Props>(function EmojiGrids({ layout, onPick }, ref) {
  const baseId = useId();
  const [active, setActive] = useState<string | null>(null);
  // The emoji active last may be gone from a narrower search, which starts again from the first cell.
  const current = (active === null ? undefined : layout.places.get(active)) ?? FIRST;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isComposing(event.nativeEvent) || event.altKey || event.shiftKey || event.metaKey) return;
    if (event.key === 'Enter') {
      const emoji = emojiAt(event.target);
      if (emoji === null) return;
      event.preventDefault();
      onPick(emoji);
      return;
    }
    const next = gridMove(layout.rowLengths, current, event.key, event.ctrlKey);
    if (next === null) return;
    event.preventDefault();
    setActive(layout.rows[next.row][next.col].emoji);
    event.currentTarget.ownerDocument.getElementById(cellId(baseId, next.row, next.col))?.focus();
  };
  const onClick = (event: MouseEvent) => {
    const emoji = emojiAt(event.target);
    if (emoji !== null) onPick(emoji);
  };
  const onFocus = (event: FocusEvent) => {
    const emoji = emojiAt(event.target);
    if (emoji !== null) setActive(emoji);
  };

  return (
    <div ref={ref} className="max-h-72 overflow-y-auto" onKeyDown={onKeyDown} onClick={onClick} onFocus={onFocus}>
      {layout.sections.map((section) => (
        <div key={section.key}>
          <div id={`${baseId}-${section.key}`} className={HEADING}>
            {section.label}
          </div>
          <div role="grid" aria-labelledby={`${baseId}-${section.key}`}>
            {section.rows.map((emoji, index) => {
              const row = section.firstRow + index;
              return (
                <EmojiRow
                  key={row}
                  baseId={baseId}
                  row={row}
                  emoji={emoji}
                  activeCol={row === current.row ? current.col : null}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
});
