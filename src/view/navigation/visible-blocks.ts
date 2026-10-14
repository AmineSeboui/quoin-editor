import type { EngineDoc } from '../../engine';
import { isClosedToggle } from '../../engine/commands/collapsed-toggle';

export function visibleBlockIndexes(doc: EngineDoc): number[] {
  const visible: number[] = [];
  let closedIndent: number | null = null;
  doc.blocks.forEach((block, index) => {
    if (closedIndent !== null && block.indent > closedIndent) return;
    closedIndent = isClosedToggle(block) ? block.indent : null;
    visible.push(index);
  });
  return visible;
}
