import type { Selection } from '../../engine';
import { sameSelection } from '../../engine/state/selection';
import { focusingSink, focusSink, heldBySink } from '../selection/selection-sink';
import { readSelection, writeSelection } from './dom-selection';
import { ownsFocus } from './focus-ownership';
import { samePoints, selectionPoints } from './selection-sync';
import type { ViewController } from './view-controller';

/** The selection the browser draws in the hosts where it is not `model`, unless a composition or a drag holds it. */
export function movedSelection(controller: ViewController, doc: Document | null, model: Selection | null): Selection | null {
  if (controller.composingKey !== null || controller.dragging || !doc || !ownsFocus(controller, doc)) return null;
  const selection = readSelection(controller.registry, doc.getSelection(), (node) => controller.blockAt(node));
  return selection === null || sameSelection(selection, model) ? null : selection;
}

/**
 * Writes the model selection into the DOM, and calls `moved` when that moved the DOM selection. While an IME composes,
 * the composing host's offset map is stale and moving the DOM selection would cancel the composition, so the selection
 * is left alone in both directions. A selection across hosts or of whole blocks has no native form in the hosts and is
 * held by the sink. Where no sink is drawn, a node selection falls back to its shell, and a caret left behind in a host
 * would be read back on the next key, so a block range empties the native selection.
 */
export function writeModelSelection(controller: ViewController, doc: Document | null, moved: () => void): void {
  const domSelection = doc?.getSelection();
  if (focusingSink(controller) || controller.composingKey !== null || !doc || !domSelection || !ownsFocus(controller, doc)) {
    return;
  }
  const before = selectionPoints(domSelection);
  const { selection } = controller.editor.state;
  if (heldBySink(selection) && controller.sink !== null) focusSink(controller);
  else if (selection?.kind === 'blocks') domSelection.removeAllRanges();
  else writeSelection(controller.registry, selection, domSelection, (id) => controller.blockElement(id));
  controller.nodeReveal.show(selection);
  if (!samePoints(before, selectionPoints(domSelection))) moved();
}
