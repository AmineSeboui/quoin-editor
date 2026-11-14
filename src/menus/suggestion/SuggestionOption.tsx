'use client';

import type { ReactNode } from 'react';
import { LIST_OPTION } from '../../ui/menu-styles';
import { keepFocus } from '../floating/keep-focus';

type OptionProps = { id: string; active: boolean; onHighlight(): void; onChoose(): void; children: ReactNode };

/** An option of a listbox that a combobox controls, which keeps focus in the combobox when it is pressed. */
export function SuggestionOption({ id, active, onHighlight, onChoose, children }: OptionProps) {
  return (
    <div
      role="option"
      id={id}
      aria-selected={active}
      data-highlighted={active ? '' : undefined}
      className={LIST_OPTION}
      onPointerDown={keepFocus}
      onMouseDown={keepFocus}
      onPointerMove={onHighlight}
      onClick={onChoose}
    >
      {children}
    </div>
  );
}
