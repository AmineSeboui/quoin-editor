import type { Selection } from '../../engine';
import { sameSelection } from '../../engine/state/selection';
import { readSelection } from './dom-selection';
import { ownsFocus } from './focus-ownership';
import type { ViewController } from './view-controller';

/** The selection the browser draws in the hosts where it is not `model`, unless a composition or a drag holds it. */
export function movedSelection(controller: ViewController, doc: Document | null, model: Selection | null): Selection | null {
  if (controller.composingKey !== null || controller.dragging || !doc || !ownsFocus(controller, doc)) return null;
  const selection = readSelection(controller.registry, doc.getSelection(), (node) => controller.blockAt(node));
  return selection === null || sameSelection(selection, model) ? null : selection;
}
