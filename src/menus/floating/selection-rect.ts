import { markRanges } from '../../engine/commands/selection-marks';
import type { ViewController } from '../../view';
import { rangeRect } from './range-rect';

function union(a: DOMRect, b: DOMRect): DOMRect {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  return new DOMRect(left, top, Math.max(a.right, b.right) - left, Math.max(a.bottom, b.bottom) - top);
}

/**
 * Where the selected text is drawn: the box round the selection in its first and its last host, which for a selection
 * across blocks spans every line between them.
 */
export function selectionRect(controller: ViewController): DOMRect | null {
  const { state } = controller.editor;
  if (state.selection?.kind !== 'text') return null;
  const ranges = markRanges(state);
  if (ranges.length === 0) return null;
  const first = rangeRect(controller, ranges[0]);
  if (ranges.length === 1) return first;
  const last = rangeRect(controller, ranges[ranges.length - 1]);
  return first === null || last === null ? (first ?? last) : union(first, last);
}
