import type { EngineBlock, EngineDoc } from '../../engine';
import { hidingToggle, isClosedToggle } from '../../engine/commands/collapsed-toggle';
import { shownOpen, type ReaderChoices } from '../controller/reader-toggles';

const known = new WeakMap<EngineDoc, readonly (number | null)[]>();

// The engine answers for one block by walking back through its ancestors, so a document is asked once, for every block
// after its first closed toggle, and the answers are kept with it.
function hidersOf(doc: EngineDoc): readonly (number | null)[] {
  let hiders = known.get(doc);
  if (hiders === undefined) {
    const first = doc.blocks.findIndex(isClosedToggle);
    hiders = doc.blocks.map((_, index) => (first < 0 || index <= first ? null : hidingToggle(doc, index + 1)));
    known.set(doc, hiders);
  }
  return hiders;
}

// The index of the outermost closed toggle that hides the block at `index`, or null when the block is drawn.
export const hidingToggleAt = (doc: EngineDoc, index: number): number | null => hidersOf(doc)[index] ?? null;

/** Whether the block at `index` is hidden by a toggle closed in the document or by a reader. */
export function isHiddenAt(doc: EngineDoc, index: number, choices: ReaderChoices): boolean {
  if (choices.size === 0) return hidingToggleAt(doc, index) !== null;
  const closed = (block: EngineBlock) => block.type === 'TOGGLE' && !shownOpen(block, choices);
  return hidingToggle(doc, index + 1, closed) !== null;
}

export const visibleBlockIndexes = (doc: EngineDoc): number[] =>
  hidersOf(doc).flatMap((hider, index) => (hider === null ? [index] : []));

/** How many of the blocks from `start` up to, not including, `end` are drawn. */
export function drawnBlockCount(doc: EngineDoc, start = 0, end = doc.blocks.length): number {
  const hiders = hidersOf(doc);
  let drawn = 0;
  for (let index = Math.max(0, start); index < Math.min(end, hiders.length); index++) if (hiders[index] === null) drawn++;
  return drawn;
}
