'use client';

import type { ReactNode } from 'react';
import { cn } from '../../ui/cn';
import { HIGHLIGHT_BAR } from '../../ui/focus';
import { TAP_TARGET_FLOOR } from '../../ui/touch-target';
import { keepFocus } from '../floating/keep-focus';

const OPTION = cn(
  'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
  HIGHLIGHT_BAR,
  TAP_TARGET_FLOOR,
);

type OptionProps = { id: string; active: boolean; onHighlight(): void; onChoose(): void; children: ReactNode };

/** An option of a listbox that a combobox controls, which keeps focus in the combobox when it is pressed. */
export function SuggestionOption({ id, active, onHighlight, onChoose, children }: OptionProps) {
  return (
    <div
      role="option"
      id={id}
      aria-selected={active}
      data-highlighted={active ? '' : undefined}
      className={OPTION}
      onPointerDown={keepFocus}
      onMouseDown={keepFocus}
      onPointerMove={onHighlight}
      onClick={onChoose}
    >
      {children}
    </div>
  );
}
