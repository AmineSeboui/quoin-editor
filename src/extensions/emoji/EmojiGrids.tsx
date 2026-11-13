'use client';

import { forwardRef, type MouseEvent } from 'react';
import { emojiAt } from './emoji-at';
import { EmojiGrid } from './EmojiGrid';
import type { PickerLayout } from './picker-layout';

type Props = { layout: PickerLayout; onPick(emoji: string): void };

/** The grids of the picker, one after another in a box that scrolls, where a click on a cell picks its emoji. */
export const EmojiGrids = forwardRef<HTMLDivElement, Props>(function EmojiGrids({ layout, onPick }, ref) {
  const onClick = (event: MouseEvent) => {
    const emoji = emojiAt(event.target);
    if (emoji !== null) onPick(emoji);
  };
  return (
    <div ref={ref} className="max-h-72 overflow-y-auto" onClick={onClick}>
      {layout.map((section) => (
        <EmojiGrid key={section.key} section={section} onPick={onPick} />
      ))}
    </div>
  );
});
