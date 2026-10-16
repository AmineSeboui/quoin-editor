'use client';

import { useLabels } from '../../i18n/use-labels';
import { Button } from '../../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import type { ViewController } from '../../view';
import { CALLOUT_ICONS } from './callout-tone';
import { returnFocusToText } from './return-focus-to-text';
import { setBlockAttrs } from './set-block-attrs';

type CalloutIconMenuProps = { blockId: string; controller: ViewController; icon: string };

export function CalloutIconMenu({ blockId, controller, icon }: CalloutIconMenuProps) {
  const labels = useLabels();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          tabIndex={-1}
          aria-label={labels.calloutIcon}
          className="text-base"
        >
          <span aria-hidden="true">{icon}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-0" onCloseAutoFocus={returnFocusToText(controller)}>
        {CALLOUT_ICONS.map((choice) => (
          <DropdownMenuItem
            key={choice}
            className="justify-center text-base"
            onSelect={() => setBlockAttrs(controller, blockId, { icon: choice })}
          >
            {choice}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
