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

// Some browsers apply the committed text in an input event after compositionend, so the sink is read once that event
// has run, or after a zero delay timeout when none comes.
export function commitSinkComposition(controller: ViewController): void {
  const { sink } = controller;
  if (sink === null) return;
  const commit = (): void => {
    clearTimeout(timer);
    sink.removeEventListener('input', commit);
    const text = sink.textContent ?? '';
    sink.textContent = '';
    if (text !== '') controller.edit(() => controller.editor.insertText(text));
  };
  const timer = setTimeout(commit, 0);
  sink.addEventListener('input', commit);
}
