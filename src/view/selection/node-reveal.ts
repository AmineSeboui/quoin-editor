import type { Selection } from '../../engine';

const nodeOf = (selection: Selection | null): string | null => (selection?.kind === 'node' ? selection.block : null);

export type NodeReveal = {
  /** Marks a block a press is selecting, which is under the pointer already. */
  pressed(block: string): void;
  /** Forgets the block shown once the selection leaves it, however it leaves, so coming back brings it into view. */
  follow(selection: Selection | null): void;
  /** Brings the block into view once; a change made here also brings in the block a settle left where it was. */
  show(selection: Selection | null, local?: boolean): void;
  /** Counts the block a selection holds as shown, and as owed to the next change made here if it was not shown yet. */
  settle(selection: Selection | null): void;
};

/**
 * Brings a block selected as a whole into view once, when the selection comes to it, as focusing its shell used to:
 * the sink that now holds the selection is fixed, and focused without scrolling. A block a press selected stays put.
 */
export function createNodeReveal(element: (block: string) => HTMLElement | undefined): NodeReveal {
  let shown: string | null = null;
  let pressed: string | null = null;
  let owed: string | null = null;
  return {
    pressed(block) {
      pressed = block;
    },
    follow(selection) {
      const block = nodeOf(selection);
      if (block !== shown) shown = null;
      if (block !== owed) owed = null;
    },
    settle(selection) {
      const block = nodeOf(selection);
      if (block !== shown) owed = block;
      shown = block;
    },
    show(selection, local) {
      const block = nodeOf(selection);
      if (block !== null && block !== pressed && (block !== shown || (local && block === owed))) {
        element(block)?.scrollIntoView({ block: 'nearest' });
      }
      if (local) owed = null;
      shown = block;
      pressed = null;
    },
  };
}
