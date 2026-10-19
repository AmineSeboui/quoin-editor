import type { EditorState } from '../../engine';
import { markRanges } from '../../engine/commands/selection-marks';
import { isCollapsed } from '../../engine/state/selection';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useReadOnly } from '../../view/react/use-read-only';
import { useFinePointer } from './use-fine-pointer';
import { useSelectionSettled } from './use-selection-settled';

// A suggestion menu opens only at a collapsed caret, so a range of text already rules one out.
const hasTextRange = (state: EditorState): boolean =>
  state.selection?.kind === 'text' && !isCollapsed(state.selection) && markRanges(state).length > 0;

/**
 * Whether the bubble toolbar shows: some text is selected, in one host or across several, the selection has settled
 * with focus in the editor or the toolbar, and the pointer is fine, since a touch screen formats from the mobile toolbar.
 */
export function useBubbleVisibility(controller: ViewController): boolean {
  const range = useEditorState(controller, hasTextRange);
  const readOnly = useReadOnly(controller);
  const fine = useFinePointer();
  const settled = useSelectionSettled(controller);
  return range && !readOnly && fine && settled;
}
