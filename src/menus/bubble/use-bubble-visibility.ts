import { useCallback } from 'react';
import type { EditorState } from '../../engine';
import { markRanges } from '../../engine/commands/selection-marks';
import { isCollapsed } from '../../engine/state/selection';
import type { ToolbarItem } from '../../extensions/ui-types';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useReadOnly } from '../../view/react/use-read-only';
import { useFinePointer } from './use-fine-pointer';
import { useSelectionSettled } from './use-selection-settled';

// A suggestion menu opens only at a collapsed caret, so a range of text already rules one out.
const hasTextRange = (state: EditorState): boolean =>
  state.selection?.kind === 'text' && !isCollapsed(state.selection) && markRanges(state).length > 0;

const NO_ITEMS: readonly ToolbarItem[] = [];

/** The items a read-only canvas keeps in the bubble toolbar. */
export const readOnlyItems = (items: readonly ToolbarItem[]): readonly ToolbarItem[] =>
  items.filter((item) => item.whileReadOnly === true);

/**
 * Whether the bubble toolbar shows: some text is selected, in one host or across several, the selection has settled
 * with focus in the editor or the toolbar, and the pointer is fine, since a touch screen formats from the mobile toolbar.
 * A read-only canvas shows it only when one of the `extraItems` works read-only and is available.
 */
export function useBubbleVisibility(controller: ViewController, extraItems: readonly ToolbarItem[] = NO_ITEMS): boolean {
  const readOnly = useReadOnly(controller);
  const selector = useCallback(
    (state: EditorState) =>
      hasTextRange(state) &&
      (!readOnly || readOnlyItems(extraItems).some((item) => item.available?.(state) !== false)),
    [readOnly, extraItems],
  );
  const range = useEditorState(controller, selector);
  const fine = useFinePointer();
  const settled = useSelectionSettled(controller);
  return range && fine && settled;
}
