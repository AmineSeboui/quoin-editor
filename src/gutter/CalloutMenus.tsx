'use client';

import { CheckIcon, Droplet, Sticker } from 'lucide-react';
import { CALLOUT_ICONS, CALLOUT_TONES, calloutTone } from '../blocks/text/callout-tone';
import type { EngineBlock } from '../engine';
import { setAttrs } from '../engine/commands/block-style';
import { useLabels } from '../i18n/use-labels';
import type { ViewController } from '../view';
import { MenuIcon } from './MenuIcon';
import type { MenuKit } from './menu-kit';
import { runOnBlocks } from './run-on-blocks';

type CalloutMenusProps = { kit: MenuKit; controller: ViewController; blocks: readonly EngineBlock[] };

const sharedTone = (blocks: readonly EngineBlock[]) => {
  const tones = new Set(blocks.map((block) => calloutTone(block.attrs.tone)));
  return tones.size === 1 ? [...tones][0] : '';
};

/** The keyboard's way to a callout's tone and icon, which its chips leave out of the tab order. */
export function CalloutMenus({ kit, controller, blocks }: CalloutMenusProps) {
  const labels = useLabels();
  const blockIds = blocks.map((block) => block.id);
  const apply = (patch: Record<string, unknown>) => runOnBlocks(controller, blockIds, setAttrs(patch));
  return (
    <>
      <kit.Sub>
        <kit.SubTrigger>
          <MenuIcon icon={Droplet} />
          {labels.tone}
        </kit.SubTrigger>
        <kit.SubContent>
          <kit.RadioGroup value={sharedTone(blocks)} onValueChange={(tone) => apply({ tone })}>
            {CALLOUT_TONES.map((tone) => (
              <kit.RadioItem key={tone} value={tone} indicator={<CheckIcon className="size-4" />}>
                {labels.calloutTones[tone]}
              </kit.RadioItem>
            ))}
          </kit.RadioGroup>
        </kit.SubContent>
      </kit.Sub>
      <kit.Sub>
        <kit.SubTrigger>
          <MenuIcon icon={Sticker} />
          {labels.icon}
        </kit.SubTrigger>
        <kit.SubContent className="min-w-0">
          {CALLOUT_ICONS.map((icon) => (
            <kit.Item key={icon} className="justify-center text-base" onSelect={() => apply({ icon })}>
              {icon}
            </kit.Item>
          ))}
        </kit.SubContent>
      </kit.Sub>
    </>
  );
}
