export type NodeReveal = {
  /** Marks a block a press is selecting, which is under the pointer already. */
  pressed(block: string): void;
  show(block: string | null): void;
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
    show(block) {
      if (block !== null && block !== shown && block !== pressed) element(block)?.scrollIntoView({ block: 'nearest' });
      shown = block;
      pressed = null;
    },
  };
}
