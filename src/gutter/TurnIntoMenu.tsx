'use client';

import { drawsType, hostLabel } from '../blocks/block-drawing';
import { useQuoin } from '../context';
import { setBlockType } from '../engine';
import { useLabels } from '../i18n/use-labels';
import { Repeat2 } from '../icons';
import type { ViewController } from '../view';
import { MenuIcon } from './MenuIcon';
import type { MenuKit } from './menu-kit';
import { runOnBlocks } from './run-on-blocks';
import { turnIntoTargets } from './turn-into-targets';

type TurnIntoMenuProps = { kit: MenuKit; controller: ViewController; blockIds: readonly string[] };

export function TurnIntoItems({ kit, controller, blockIds }: TurnIntoMenuProps) {
  const { blockTypes, labels } = useQuoin();
  const targets = turnIntoTargets(labels).filter((target) => drawsType(blockTypes, target.type));
  return targets.map((target) => (
    <kit.Item key={target.id} onSelect={() => runOnBlocks(controller, blockIds, setBlockType(target.type, target.attrs))}>
      <MenuIcon icon={target.icon} />
      {hostLabel(blockTypes, target.type) ?? target.label}
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
