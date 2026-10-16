'use client';

import { Repeat2 } from 'lucide-react';
import { setBlockType } from '../engine';
import { useLabels } from '../i18n/use-labels';
import type { ViewController } from '../view';
import { MenuIcon } from './MenuIcon';
import type { MenuKit } from './menu-kit';
import { runOnBlocks } from './run-on-blocks';
import { turnIntoTargets } from './turn-into-targets';

type TurnIntoMenuProps = { kit: MenuKit; controller: ViewController; blockIds: string[] };

export function TurnIntoMenu({ kit, controller, blockIds }: TurnIntoMenuProps) {
  const labels = useLabels();
  return (
    <kit.Sub>
      <kit.SubTrigger>
        <MenuIcon icon={Repeat2} />
        {labels.turnInto}
      </kit.SubTrigger>
      <kit.SubContent>
        {turnIntoTargets(labels).map((target) => (
          <kit.Item
            key={target.id}
            onSelect={() => runOnBlocks(controller, blockIds, setBlockType(target.type, target.attrs))}
          >
            <MenuIcon icon={target.icon} />
            {target.label}
          </kit.Item>
        ))}
      </kit.SubContent>
    </kit.Sub>
  );
}
