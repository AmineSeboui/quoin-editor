import type { Pos } from '../../engine';
import { sameSelection, selectionRange, textSelection } from '../../engine/state/selection';
import type { ViewController } from '../controller/view-controller';
import { domToPos } from '../controller/dom-selection';

export type ModelRange = { from: Pos; to: Pos };

export function targetRangeToModel(controller: ViewController, event: InputEvent): ModelRange | null {
  const range = typeof event.getTargetRanges === 'function' ? event.getTargetRanges()[0] : undefined;
  if (range === undefined) return null;
  const from = domToPos(controller.registry, range.startContainer, range.startOffset);
  const to = domToPos(controller.registry, range.endContainer, range.endOffset);
  return from && to && { from, to };
}

const isEmpty = ({ from, to }: ModelRange): boolean => sameSelection(textSelection(from), textSelection(to));

// The range a command would not already act on: a target range is ordered, so it is compared with the selection in
// document order, whichever way the selection points.
export function targetBeyondSelection(controller: ViewController, event: InputEvent): ModelRange | null {
  const range = targetRangeToModel(controller, event);
  if (range === null || isEmpty(range)) return null;
  const { doc, selection } = controller.editor.state;
  const selected = selectionRange(doc, selection);
  const same = selected !== null && sameSelection(textSelection(selected.from, selected.to), textSelection(range.from, range.to));
  return same ? null : range;
}
