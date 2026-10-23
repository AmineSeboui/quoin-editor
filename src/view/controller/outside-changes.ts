import type { Selection, Transaction } from '../../engine';
import { mapSelection } from '../../engine/state/selection';

export type OutsideChanges = {
  inside(change: () => void): void;
  committed(tr: Transaction | null): void;
  takeFocused(): boolean;
  takeMoved(): Selection | null;
};

// The controller makes its own changes inside(). Any other transaction, from the host's blocks, a command or a plugin,
// is noted with whether the editor had focus then: the host it changes can be replaced before React draws it again.
// The browser's own caret moves reach the model on the selection change they queue, a task later. A change from
// outside that commits first would have the render write the older model selection over the newer caret, so the DOM
// selection, still drawn for the document before that change, is read where it differs from the model's and carried
// through every change until it is taken. The DOM is read once until the next take: a second change before the draw
// would find it still drawn for the document before the first. A change from outside that sets the selection itself
// means to move it: it drops that selection, and the DOM is not read again until the next take either.
export function createOutsideChanges(
  editorHasFocus: () => boolean,
  movedFrom: (model: Selection | null) => Selection | null,
): OutsideChanges {
  let depth = 0;
  let focused = false;
  let moved: Selection | null = null;
  let settled = false;
  return {
    inside(change) {
      depth += 1;
      try {
        change();
      } finally {
        depth -= 1;
      }
    },
    committed(tr) {
      const outside = depth === 0 && editorHasFocus();
      focused ||= outside;
      if (tr?.selectionSet !== false) {
        moved = null;
        settled ||= depth === 0;
        return;
      }
      const from = moved ?? (outside && !settled ? movedFrom(tr.before.selection) : null);
      settled ||= outside;
      moved = from && mapSelection(from, (pos, assoc) => tr.mapPos(pos, assoc), tr.before.doc);
    },
    takeFocused() {
      const value = focused;
      focused = false;
      return value;
    },
    takeMoved() {
      const value = moved;
      moved = null;
      settled = false;
      return value;
    },
  };
}
