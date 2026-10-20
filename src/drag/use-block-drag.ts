import { useEffect, useRef, type MouseEvent, type PointerEvent, type RefObject } from 'react';
import { blockMovedMessage } from '../canvas/structure-announcement';
import type { CanvasUiStore } from '../canvas/ui-store';
import { useLabels } from '../i18n/use-labels';
import type { ViewController } from '../view';
import type { DragOverlayHandle } from './DragOverlay';
import { pressDragHandle } from './press-drag-handle';

export type BlockDrag = {
  onPointerDown(event: PointerEvent<HTMLElement>): void;
  /**
   * Whether a click on the handle ends a drag rather than asking for the menu. A click with no pointer behind it, from the
   * keyboard or assistive technology, never does.
   */
  takeClick(event: MouseEvent): boolean;
};

/** Drags the block whose handle is pressed. A touch is left to scroll the page and tap the handle. */
export function useBlockDrag(
  controller: ViewController,
  store: CanvasUiStore,
  blockId: string | null,
  overlay: RefObject<DragOverlayHandle | null>,
): BlockDrag {
  const labels = useLabels();
  const cancel = useRef<(() => void) | null>(null);
  const dragged = useRef(false);

  useEffect(() => () => cancel.current?.(), []);

  return {
    onPointerDown(event) {
      cancel.current?.();
      cancel.current = null;
      dragged.current = false;
      const layer = overlay.current;
      if (event.button !== 0 || event.pointerType === 'touch' || blockId === null || layer === null) return;
      cancel.current = pressDragHandle({
        controller,
        store,
        overlay: layer,
        blockId,
        handle: event.currentTarget,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        onDragStart: () => {
          dragged.current = true;
        },
        // The canvas has already said where a drop moved the block, and the announcer says the same words for the
        // same state once, so this is heard only for a drop that nested the block in place.
        onMoved: (movedId) => controller.announce(blockMovedMessage(controller.editor.state.doc, movedId, labels)),
      });
    },
    takeClick(event) {
      const taken = dragged.current && event.detail > 0;
      dragged.current = false;
      return taken;
    },
  };
}
