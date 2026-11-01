import { isCollapsed, textSelection } from '../../engine/state/selection';
import { dispatchSelection } from '../controller/dispatch-selection';
import type { ViewController } from '../controller/view-controller';
import { glyphsAround } from './glyph';
import { wrapsAt } from './stay-on-line';

// A click past the end of a line before a soft wrap puts the caret at the end of that line, which the native selection
// cannot tell from the start of the next one, so the side is taken from where the pointer was.
export function keepClickedSide(controller: ViewController, y: number): void {
  controller.readSelectionFromDom();
  const { selection } = controller.editor.state;
  if (selection?.kind !== 'text' || !isCollapsed(selection)) return;
  const upstream = wrapsAt(selection.head, y, glyphsAround(controller.registry, selection.head)) !== null;
  if (upstream !== (selection.assoc === -1)) {
    const caret = textSelection(selection.head);
    dispatchSelection(controller, upstream ? { ...caret, assoc: -1 } : caret);
  }
}
