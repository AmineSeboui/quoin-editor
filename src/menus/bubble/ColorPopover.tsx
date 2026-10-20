'use client';

import { Baseline } from 'lucide-react';
import type { Command, EditorState } from '../../engine';
import { setMark, unsetMark } from '../../engine/commands/marks';
import { markRanges, rangeContent } from '../../engine/commands/selection-marks';
import { ColorGroups, type ColorKey } from '../../gutter/ColorMenu';
import { DROPDOWN_KIT } from '../../gutter/menu-kit';
import { useLabels } from '../../i18n/use-labels';
import { Button } from '../../ui/button';
import type { ViewController } from '../../view';
import { ToolbarMenu } from './ToolbarMenu';

const MARKS: Readonly<Record<ColorKey, string>> = { color: 'color', background: 'highlight' };

function selectionColor(state: EditorState, mark: string): string {
  const names = new Set<unknown>();
  for (const range of markRanges(state)) {
    for (const node of rangeContent(state, range)) {
      const found = node.marks.find((candidate) => candidate.type === mark);
      names.add(found === undefined ? 'default' : found.attrs?.color);
    }
  }
  const [only] = names;
  return names.size === 1 && typeof only === 'string' ? only : '';
}

function colorCommand(key: ColorKey, name: string): Command {
  return name === 'default' ? unsetMark(MARKS[key]) : setMark(MARKS[key], { color: name });
}

type ColorPopoverProps = { controller: ViewController; state: EditorState };

export function ColorPopover({ controller, state }: ColorPopoverProps) {
  const labels = useLabels();
  const value = { color: selectionColor(state, MARKS.color), background: selectionColor(state, MARKS.background) };
  const trigger = (
    <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.color}>
      <Baseline />
    </Button>
  );
  return (
    <ToolbarMenu controller={controller} trigger={trigger}>
      <ColorGroups kit={DROPDOWN_KIT} value={value} onPick={(key, name) => controller.run(colorCommand(key, name))} />
    </ToolbarMenu>
  );
}
