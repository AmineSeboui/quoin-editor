export type OutsideChanges = {
  inside(change: () => void): void;
  committed(): void;
  takeFocused(): boolean;
};

// The controller makes its own changes inside(). Any other transaction, from the host's blocks, a command or a plugin,
// is noted with whether the editor had focus then: the host it changes can be replaced before React draws it again.
export function createOutsideChanges(editorHasFocus: () => boolean): OutsideChanges {
  let depth = 0;
  let focused = false;
  return {
    inside(change) {
      depth += 1;
      try {
        change();
      } finally {
        depth -= 1;
      }
    },
    committed() {
      if (depth === 0) focused ||= editorHasFocus();
    },
    takeFocused() {
      const value = focused;
      focused = false;
      return value;
    },
  };
}
