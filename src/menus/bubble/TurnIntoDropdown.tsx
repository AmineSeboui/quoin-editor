'use client';

import { ChevronDown } from 'lucide-react';
import type { EditorState } from '../../engine';
import { selectedBlockIds } from '../../engine/state/selection';
import { DROPDOWN_KIT } from '../../gutter/menu-kit';
import { TurnIntoItems } from '../../gutter/TurnIntoMenu';
import { useLabels } from '../../i18n/use-labels';
import { Button } from '../../ui/button';
import type { ViewController } from '../../view';
import { ToolbarMenu } from './ToolbarMenu';

type TurnIntoDropdownProps = { controller: ViewController; state: EditorState };

export function TurnIntoDropdown({ controller, state }: TurnIntoDropdownProps) {
  const labels = useLabels();
  const trigger = (
    <Button type="button" variant="ghost" size="sm" className="gap-1 px-2 has-[>svg]:px-2">
      {labels.turnInto}
      <ChevronDown />
    </Button>
  );
  return (
    <ToolbarMenu controller={controller} trigger={trigger}>
      <TurnIntoItems kit={DROPDOWN_KIT} controller={controller} blockIds={selectedBlockIds(state.doc, state.selection)} />
    </ToolbarMenu>
  );
}
