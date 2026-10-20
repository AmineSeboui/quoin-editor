'use client';

import type { BlockAttrs, EditorState } from '../../engine';
import { blockById } from '../../engine/model/doc';
import { useSelectionSettled } from '../../menus/bubble/use-selection-settled';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useReadOnly } from '../../view/react/use-read-only';

/** Reads the block of the type selected as a whole, while it holds what `filled` looks for. */
export const selectedBlock =
  (type: string, filled: (attrs: BlockAttrs) => boolean) =>
  ({ doc, selection }: EditorState): string | null => {
    const block = selection?.kind === 'node' ? blockById(doc, selection.block) : undefined;
    return block?.type === type && filled(block.attrs) ? block.id : null;
  };

/**
 * The block a floating toolbar is drawn for: the one `selected` reads, on an editable canvas, while focus is in the
 * editor or in the toolbar, or while a popover of the toolbar is open on it.
 */
export function useToolbarBlock(
  controller: ViewController,
  selected: (state: EditorState) => string | null,
  keptFor: string | null = null,
): string | null {
  const blockId = useEditorState(controller, selected);
  const readOnly = useReadOnly(controller);
  const settled = useSelectionSettled(controller);
  return blockId !== null && !readOnly && (settled || keptFor === blockId) ? blockId : null;
}
