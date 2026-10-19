'use client';

import { AlignCenter, AlignJustify, AlignLeft, AlignRight, CheckIcon } from 'lucide-react';
import type { Align, EditorState } from '../../engine';
import { alignOrUndefined } from '../../engine/blocks/data-fields';
import { setTextAlign } from '../../engine/commands/block-style';
import { blockById } from '../../engine/model/doc';
import { selectedBlockIds } from '../../engine/state/selection';
import { MenuIcon } from '../../gutter/MenuIcon';
import { useLabels } from '../../i18n/use-labels';
import { Button } from '../../ui/button';
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from '../../ui/dropdown-menu';
import type { ViewController } from '../../view';
import { ToolbarMenu } from './ToolbarMenu';

const ICONS = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify } as const;
const ALIGNS = Object.keys(ICONS) as Align[];
const LABEL_KEYS = { left: 'alignLeft', center: 'alignCenter', right: 'alignRight', justify: 'alignJustify' } as const;

// Only text blocks take an alignment. Null when the selection holds none, an empty string when they differ.
function sharedAlign(state: EditorState): string | null {
  const blocks = selectedBlockIds(state.doc, state.selection)
    .map((id) => blockById(state.doc, id))
    .filter((block) => block?.type === 'MARKDOWN');
  if (blocks.length === 0) return null;
  const aligns = new Set(blocks.map((block) => alignOrUndefined(block?.attrs.align) ?? 'left'));
  return aligns.size === 1 ? [...aligns][0] : '';
}

type AlignDropdownProps = { controller: ViewController; state: EditorState };

export function AlignDropdown({ controller, state }: AlignDropdownProps) {
  const labels = useLabels();
  const value = sharedAlign(state);
  if (value === null) return null;
  const Icon = value === '' ? AlignLeft : ICONS[value as Align];
  const trigger = (
    <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.align}>
      <Icon />
    </Button>
  );
  return (
    <ToolbarMenu controller={controller} trigger={trigger}>
      <DropdownMenuRadioGroup value={value} onValueChange={(align) => controller.run(setTextAlign(align as Align))}>
        {ALIGNS.map((align) => (
          <DropdownMenuRadioItem key={align} value={align} indicator={<CheckIcon className="size-4" />}>
            <MenuIcon icon={ICONS[align]} />
            {labels[LABEL_KEYS[align]]}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </ToolbarMenu>
  );
}
