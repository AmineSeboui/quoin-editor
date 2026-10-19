'use client';

import { Repeat2 } from 'lucide-react';
import { setBlockType } from '../engine';
import { useLabels } from '../i18n/use-labels';
import type { ViewController } from '../view';
import { MenuIcon } from './MenuIcon';
import type { MenuKit } from './menu-kit';
import { runOnBlocks } from './run-on-blocks';
import { turnIntoTargets } from './turn-into-targets';

type TurnIntoMenuProps = { kit: MenuKit; controller: ViewController; blockIds: readonly string[] };

/** One item per type the blocks can turn into, drawn with the parts of whichever menu holds them. */
export function TurnIntoItems({ kit, controller, blockIds }: TurnIntoMenuProps) {
  const labels = useLabels();
  return turnIntoTargets(labels).map((target) => (
    <kit.Item key={target.id} onSelect={() => runOnBlocks(controller, blockIds, setBlockType(target.type, target.attrs))}>
      <MenuIcon icon={target.icon} />
      {target.label}
    </kit.Item>
  ));
}

export function TurnIntoMenu(props: TurnIntoMenuProps) {
  const { kit } = props;
  const labels = useLabels();
  return (
    <kit.Sub>
      <kit.SubTrigger>
        <MenuIcon icon={Repeat2} />
        {labels.turnInto}
      </kit.SubTrigger>
      <kit.SubContent>
        <TurnIntoItems {...props} />
      </kit.SubContent>
    </kit.Sub>
  );
}
