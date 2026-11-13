'use client';

import { memo, useId, useState, type FocusEvent, type KeyboardEvent } from 'react';
import type { Emoji } from '../../emoji/emoji-types';
import { cn } from '../../ui/cn';
import { arrowAsWritten, inlineDirection } from '../../ui/direction';
import { FOCUS_RING } from '../../ui/focus';
import { isComposing } from './composing-key';
import { emojiAt } from './emoji-at';
import { emojiName } from './emoji-name';
import { gridMove, type GridCell } from './grid-moves';
import type { PickerSection } from './picker-layout';

type Props = { section: PickerSection; onPick(emoji: string): void };

const CELL = cn(
  'flex size-8 shrink-0 cursor-default items-center justify-center rounded-md text-xl hover:bg-accent',
  FOCUS_RING,
);
const HEADING = 'px-1 pt-2 pb-1 text-xs font-medium text-muted-foreground';
const FIRST: GridCell = { row: 0, col: 0 };

const cellId = (baseId: string, row: number, col: number) => `${baseId}-cell-${row}-${col}`;

type RowProps = { baseId: string; row: number; emoji: readonly Emoji[]; activeCol: number | null };

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
 * A grid of the picker under its heading, and a tab stop of its own. The arrows, Home and End move among its cells and
 * stop at its edges, and Enter picks the emoji of a cell.
 */
export function EmojiGrid({ section, onPick }: Props) {
  const baseId = useId();
  const [active, setActive] = useState<string | null>(null);
  const current = (active === null ? undefined : section.places.get(active)) ?? FIRST;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isComposing(event.nativeEvent) || event.altKey || event.shiftKey || event.metaKey) return;
    if (event.key === 'Enter') {
      const emoji = emojiAt(event.target);
      if (emoji === null) return;
      event.preventDefault();
      onPick(emoji);
      return;
    }
    const key = arrowAsWritten(event.key, inlineDirection(event.currentTarget));
    const next = gridMove(section.rowLengths, current, key, event.ctrlKey);
    if (next === null) return;
    event.preventDefault();
    setActive(section.rows[next.row][next.col].emoji);
    event.currentTarget.ownerDocument.getElementById(cellId(baseId, next.row, next.col))?.focus();
  };
  const onFocus = (event: FocusEvent) => {
    const emoji = emojiAt(event.target);
    if (emoji !== null) setActive(emoji);
  };

  return (
    <div>
      <div id={`${baseId}-label`} className={HEADING}>
        {section.label}
      </div>
      <div role="grid" aria-labelledby={`${baseId}-label`} onKeyDown={onKeyDown} onFocus={onFocus}>
        {section.rows.map((emoji, row) => (
          <EmojiRow
            key={row}
            baseId={baseId}
            row={row}
            emoji={emoji}
            activeCol={row === current.row ? current.col : null}
          />
        ))}
      </div>
    </div>
  );
}
