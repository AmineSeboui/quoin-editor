export type ElementSlot = {
  readonly element: HTMLElement | null;
  register(element: HTMLElement): () => void;
};

export function createElementSlot(changed: () => void): ElementSlot {
  let current: HTMLElement | null = null;
  return {
    get element() {
      return current;
    },
    register(element) {
      current = element;
      changed();
      return () => {
        if (current === element) current = null;
        changed();
      };
    },
  };
}
