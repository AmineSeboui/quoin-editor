import type { EngineDoc } from '../model/types';

// Block steps address blocks by index and keep the identity map, and an indent change can leave an older indent step
// orphaning a block, so a neutral step must also keep every block at its index and indent.
export function sameLayout(before: EngineDoc, after: EngineDoc): boolean {
  return (
    before.blocks.length === after.blocks.length &&
    before.blocks.every(({ id, indent }, index) => id === after.blocks[index].id && indent === after.blocks[index].indent)
  );
}
