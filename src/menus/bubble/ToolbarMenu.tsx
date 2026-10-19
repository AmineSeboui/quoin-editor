'use client';

import { useRef, type ReactElement, type ReactNode } from 'react';
import { returnFocusToText } from '../../blocks/text/return-focus-to-text';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import type { ViewController } from '../../view';
import { BUBBLE_PART, isBubblePart } from './use-selection-settled';

type ToolbarMenuProps = { controller: ViewController; trigger: ReactElement; children: ReactNode };

/**
 * A menu the toolbar opens. On close focus goes back to its button when the keyboard opened it from the toolbar, as a
 * menu button does, and back to the text when a click opened it, since the click never took focus from there.
 */
export function ToolbarMenu({ controller, trigger, children }: ToolbarMenuProps) {
  const fromToolbar = useRef(false);
  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) fromToolbar.current = isBubblePart(document.activeElement);
      }}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        onCloseAutoFocus={(event) => {
          if (!fromToolbar.current) returnFocusToText(controller)(event);
        }}
        {...{ [BUBBLE_PART]: '' }}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
