import { useEffect, useState, type RefObject } from 'react';
import { useCanvasUi, type CanvasUiStore } from '../canvas/ui-store';
import type { EditorState } from '../engine';
import { headBlockId } from '../engine/commands/block-helpers';
import type { ViewController } from '../view';
import { listen } from '../view/dom/listen';
import { useEditorState } from '../view/react/use-editor-state';

const headOf = (state: EditorState) => headBlockId(state.selection);

// Between blocks, in the editor's padding or beside a short block, the pointer belongs to the block across the middle
// of the editor at its height, so the gutter can be reached by moving left from any block.
function blockAcross(controller: ViewController, root: HTMLElement, y: number): string | undefined {
  const box = root.getBoundingClientRect();
  const probe = root.ownerDocument.elementFromPoint?.(box.left + box.width / 2, y);
  return probe && root.contains(probe) ? controller.blockAt(probe) : undefined;
}

export function useGutterTarget(
  controller: ViewController,
  store: CanvasUiStore,
  gutter: RefObject<HTMLElement | null>,
): { target: string | null; focused: boolean } {
  const hovered = useCanvasUi(store, (state) => state.hoveredBlock);
  const head = useEditorState(controller, headOf);
  const [focusWithin, setFocusWithin] = useState(false);

  useEffect(() => {
    const root = controller.root;
    if (root === null) return;
    const pinned = () => store.get().blockMenu !== null || store.get().drag !== null;
    const onPointerMove = (event: PointerEvent) => {
      const target = event.target as Node;
      if (event.pointerType === 'touch' || pinned() || gutter.current?.contains(target)) return;
      const block = controller.blockAt(target) ?? blockAcross(controller, root, event.clientY);
      if (block !== undefined) store.set({ hoveredBlock: block });
    };
    const onPointerLeave = () => {
      if (!pinned()) store.set({ hoveredBlock: null });
    };
    const onFocusIn = () => setFocusWithin(true);
    const onFocusOut = (event: FocusEvent) => setFocusWithin(root.contains(event.relatedTarget as Node | null));
    setFocusWithin(root.contains(root.ownerDocument.activeElement));
    return listen(root, { pointermove: onPointerMove, pointerleave: onPointerLeave, focusin: onFocusIn, focusout: onFocusOut });
  }, [controller, store, gutter]);

  const fallback = focusWithin ? head : null;
  const target = hovered ?? fallback;
  return { target, focused: target !== null && target === fallback };
}
