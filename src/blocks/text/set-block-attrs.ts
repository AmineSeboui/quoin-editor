import { setAttrs } from '../../engine/commands/block-style';
import type { ViewController } from '../../view';
import { onBlock } from '../../view/react/block-command';

export function setBlockAttrs(controller: ViewController, blockId: string, patch: Record<string, unknown>): void {
  if (!controller.readOnly) controller.run(onBlock(blockId, setAttrs(patch)));
}
