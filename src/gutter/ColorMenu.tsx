'use client';

import { useId, type ReactNode } from 'react';
import { CheckIcon, Palette } from 'lucide-react';
import { PALETTE, type EngineBlock } from '../engine';
import { paletteOrUndefined } from '../engine/blocks/data-fields';
import { setBlockColor } from '../engine/commands/block-style';
import type { PaletteName } from '../engine/markdown/palette-rgb';
import { useLabels } from '../i18n/use-labels';
import type { ViewController } from '../view';
import { MenuIcon } from './MenuIcon';
import type { MenuKit } from './menu-kit';
import { runOnBlocks } from './run-on-blocks';

type ColorKey = 'color' | 'background';

type ColorMenuProps = { kit: MenuKit; controller: ViewController; blocks: readonly EngineBlock[] };

function sharedColor(blocks: readonly EngineBlock[], key: ColorKey): string {
  const coloured = blocks.filter((block) => block.type === 'MARKDOWN');
  const colors = new Set(coloured.map((block) => paletteOrUndefined(block.attrs[key]) ?? 'default'));
  return colors.size === 1 ? [...colors][0] : '';
}

const swatches: Readonly<Record<ColorKey, (name: PaletteName) => ReactNode>> = {
  color: (name) => (
    <span aria-hidden="true" data-color={name} className="w-4 text-center font-medium">
      A
    </span>
  ),
  background: (name) => <span aria-hidden="true" data-bg={name} className="size-4 rounded-sm border border-border" />,
};

export function ColorMenu({ kit, controller, blocks }: ColorMenuProps) {
  const labels = useLabels();
  const textTitle = useId();
  const backgroundTitle = useId();
  const blockIds = blocks.map((block) => block.id);
  const pick = (key: ColorKey) => (name: string) =>
    runOnBlocks(controller, blockIds, setBlockColor({ [key]: name === 'default' ? null : name }));

  const group = (key: ColorKey, title: string, titleId: string) => (
    <>
      <kit.Label id={titleId}>{title}</kit.Label>
      <kit.RadioGroup aria-labelledby={titleId} value={sharedColor(blocks, key)} onValueChange={pick(key)}>
        {PALETTE.map((name) => (
          <kit.RadioItem key={name} value={name} indicator={<CheckIcon className="size-4" />}>
            {swatches[key](name)}
            {labels.colors[name]}
          </kit.RadioItem>
        ))}
      </kit.RadioGroup>
    </>
  );

  return (
    <kit.Sub>
      <kit.SubTrigger>
        <MenuIcon icon={Palette} />
        {labels.color}
      </kit.SubTrigger>
      <kit.SubContent>
        {group('color', labels.textColor, textTitle)}
        <kit.Separator />
        {group('background', labels.backgroundColor, backgroundTitle)}
      </kit.SubContent>
    </kit.Sub>
  );
}
