'use client';

import { useLabels } from '../../i18n/use-labels';
import type { CalloutTone } from '../../i18n/labels';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import type { ViewController } from '../../view';
import { CALLOUT_TONES } from './callout-tone';
import { returnFocusToText } from './return-focus-to-text';
import { setBlockAttrs } from './set-block-attrs';

const SHOWN_WITH_THE_BLOCK = [
  'opacity-0 group-hover/callout:opacity-100 group-focus-within/callout:opacity-100',
  'in-data-[selected=true]:opacity-100 pointer-coarse:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100',
].join(' ');

type CalloutToneMenuProps = { blockId: string; controller: ViewController; tone: CalloutTone };

export function CalloutToneMenu({ blockId, controller, tone }: CalloutToneMenuProps) {
  const labels = useLabels();
  const name = labels.calloutTones[tone];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          tabIndex={-1}
          aria-label={labels.calloutToneMenu(name)}
          className={SHOWN_WITH_THE_BLOCK}
        >
          {name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onCloseAutoFocus={returnFocusToText(controller)}>
        <DropdownMenuRadioGroup
          value={tone}
          onValueChange={(value) => setBlockAttrs(controller, blockId, { tone: value })}
        >
          {CALLOUT_TONES.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {labels.calloutTones[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
