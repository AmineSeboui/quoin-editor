'use client';

import { useRef, type ReactElement, type ReactNode } from 'react';
import { returnFocusToText } from '../../blocks/text/return-focus-to-text';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import type { ViewController } from '../../view';
import { bubblePart, isBubblePart } from './bubble-part';

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
        if (open) fromToolbar.current = isBubblePart(document.activeElement, controller);
      }}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        onCloseAutoFocus={(event) => {
          if (!fromToolbar.current) returnFocusToText(controller)(event);
        }}
        {...bubblePart(controller)}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
