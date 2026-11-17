import { useCallback } from 'react';
import type { EditorState } from '../../engine';
import type { ToolbarItem } from '../../extensions/ui-types';
import { hasTextRange, showsReadOnlyItems } from '../../toolbar/read-only-items';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useReadOnly } from '../../view/react/use-read-only';
import { useFinePointer } from './use-fine-pointer';
import { useSelectionSettled } from './use-selection-settled';

const NO_ITEMS: readonly ToolbarItem[] = [];

/**
 * Whether the bubble toolbar shows: some text is selected, in one host or across several, the selection has settled
 * with focus in the editor or the toolbar, and the pointer is fine, since a touch screen formats from the mobile toolbar.
 * A read-only canvas shows it only when one of the `extraItems` works read-only and is available.
 */
export function useBubbleVisibility(controller: ViewController, extraItems: readonly ToolbarItem[] = NO_ITEMS): boolean {
  const readOnly = useReadOnly(controller);
  const selector = useCallback(
    (state: EditorState) => (readOnly ? showsReadOnlyItems(state, extraItems) : hasTextRange(state)),
    [readOnly, extraItems],
  );
  const range = useEditorState(controller, selector);
  const fine = useFinePointer();
  const settled = useSelectionSettled(controller);
  return range && fine && settled;
}
