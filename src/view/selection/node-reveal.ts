import type { Selection } from '../../engine';

const nodeOf = (selection: Selection | null): string | null => (selection?.kind === 'node' ? selection.block : null);

export type NodeReveal = {
  /** Marks a block a press is selecting, which is under the pointer already. */
  pressed(block: string): void;
  /** Forgets the block shown once the selection leaves it, however it leaves, so coming back brings it into view. */
  follow(selection: Selection | null): void;
  show(selection: Selection | null): void;
};

/**
 * Brings a block selected as a whole into view once, when the selection comes to it, as focusing its shell used to:
 * the sink that now holds the selection is fixed, and focused without scrolling. A block a press selected stays put.
 */
export function createNodeReveal(element: (block: string) => HTMLElement | undefined): NodeReveal {
  let shown: string | null = null;
  let pressed: string | null = null;
  return {
    pressed(block) {
      pressed = block;
    },
    follow(selection) {
      if (nodeOf(selection) !== shown) shown = null;
    },
    show(selection) {
      const block = nodeOf(selection);
      if (block !== null && block !== shown && block !== pressed) element(block)?.scrollIntoView({ block: 'nearest' });
      shown = block;
      pressed = null;
    },
  };
}
