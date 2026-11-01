import { isCollapsed } from '../../engine/state/selection';
import { dispatchSelection } from '../controller/dispatch-selection';
import type { ViewController } from '../controller/view-controller';
import { glyphsAround } from './glyph';
import { wrapsAt } from './stay-on-line';

// A click past the end of a line before a soft wrap puts the caret at the end of that line, which the native selection
// cannot tell from the start of the next one, so the side is taken from where the pointer was.
export function keepClickedSide(controller: ViewController, y: number): void {
  controller.readSelectionFromDom();
  const { selection } = controller.editor.state;
  if (selection?.kind !== 'text' || !isCollapsed(selection) || selection.assoc === -1) return;
  if (wrapsAt(selection.head, y, glyphsAround(controller.registry, selection.head))) {
    dispatchSelection(controller, { ...selection, assoc: -1 });
  }
}
