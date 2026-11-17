import type { EditorState } from '../engine';
import { markRanges } from '../engine/commands/selection-marks';
import { isCollapsed } from '../engine/state/selection';
import type { ToolbarItem } from '../extensions/ui-types';

// A suggestion menu opens only at a collapsed caret, so a range of text already rules one out.
export const hasTextRange = (state: EditorState): boolean =>
  state.selection?.kind === 'text' && !isCollapsed(state.selection) && markRanges(state).length > 0;

/** The items a read-only canvas keeps in its toolbars, the bubble toolbar and the mobile one alike. */
export const readOnlyItems = (items: readonly ToolbarItem[]): readonly ToolbarItem[] =>
  items.filter((item) => item.whileReadOnly === true);

/** Whether a read-only canvas shows a toolbar: some text is selected and an item that works read-only is available. */
export const showsReadOnlyItems = (state: EditorState, items: readonly ToolbarItem[]): boolean =>
  hasTextRange(state) && readOnlyItems(items).some((item) => item.available?.(state) !== false);
