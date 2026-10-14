import type { EditorState } from '../../engine';
import { markRanges, rangeContent } from '../../engine/commands/selection-marks';
import { inlinePlainText } from '../../engine/render/block-plain-text';
import type { ViewController } from '../controller/view-controller';

function selectionText(state: EditorState): string {
  return markRanges(state)
    .map((range) => inlinePlainText(rangeContent(state, range), state.schema))
    .join('\n');
}

// The sink's own text stays selected, so a composition replaces it and leaves only what was composed, and a screen
// reader reads it as the selection.
export function focusSink(controller: ViewController): void {
  const { sink } = controller;
  if (sink === null) return;
  const text = selectionText(controller.editor.state);
  if (sink.textContent !== text) sink.textContent = text;
  if (sink.ownerDocument.activeElement !== sink) sink.focus({ preventScroll: true });
  sink.ownerDocument.getSelection()?.selectAllChildren(sink);
}

export function clearSink(controller: ViewController): void {
  if (controller.sink !== null) controller.sink.textContent = '';
}
