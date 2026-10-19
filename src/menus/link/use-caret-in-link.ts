import type { EditorState } from '../../engine';
import { isCollapsed } from '../../engine/state/selection';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useSelectionSettled } from '../bubble/use-selection-settled';
import { linkAtSelection } from './link-at-selection';
import { useRestedValue } from './use-rested-value';

// A string, so that a caret moving inside one link, or typing in it, renders nothing.
function caretLinkKey(state: EditorState): string | null {
  const { selection } = state;
  if (selection?.kind !== 'text' || !isCollapsed(selection)) return null;
  const link = linkAtSelection(state);
  return link && [link.range.block, link.range.region, link.range.from, link.href].join('\u0000');
}

/** Whether a collapsed caret has rested in one link for `delay` ms, with the writer still in the text. */
export function useCaretInLink(controller: ViewController, delay: number): boolean {
  const key = useEditorState(controller, caretLinkKey);
  const settled = useSelectionSettled(controller);
  return useRestedValue(settled ? key : null, delay) !== null;
}
