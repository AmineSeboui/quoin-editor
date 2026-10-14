import type { EditorState, Selection } from '../../engine';
import { markRanges, rangeContent } from '../../engine/commands/selection-marks';
import { inlinePlainText } from '../../engine/render/block-plain-text';
import type { ViewController } from '../controller/view-controller';
import { isCrossSelection } from './selection-decorations';

// Firefox and Safari fire copy and cut only for a selection they can see, so a selection no host holds, across hosts or
// of whole blocks, is held by the sink as text that is selected natively.
export function heldBySink(selection: Selection | null): boolean {
  return selection?.kind === 'blocks' || isCrossSelection(selection);
}

// Blocks with no text, such as a divider, would leave the sink selecting nothing and so firing no clipboard event.
const NO_TEXT = '\u00a0';

function selectionText(state: EditorState): string {
  const text = markRanges(state)
    .map((range) => inlinePlainText(rangeContent(state, range), state.schema))
    .join('\n');
  return text === '' ? NO_TEXT : text;
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
  const { sink } = controller;
  if (sink !== null && sink.textContent !== '') sink.textContent = '';
}
