import type { CanvasUiStore } from '../canvas/ui-store';
import { moveBlocksTo } from '../engine/commands/move-blocks-to';
import { menuTargets } from '../gutter/block-menu-items';
import type { ViewController } from '../view';
import { createAutoScroll } from '../view/selection/auto-scroll';
import { measureDrag, rootOrigin, type DragLayout } from './drag-layout';
import type { DragOverlayHandle } from './DragOverlay';
import { computeDropTarget, type DropTarget } from './drop-target';

const DRAG_DISTANCE = 4;
const SCROLL_EDGE = 48;

export type HandlePress = {
  controller: ViewController;
  store: CanvasUiStore;
  overlay: DragOverlayHandle;
  blockId: string;
  handle: HTMLElement;
  pointerId: number;
  x: number;
  y: number;
  onDragStart(): void;
  onMoved(blockId: string): void;
};

type ActiveDrag = { ids: string[]; layout: DragLayout; target: DropTarget | null };

const sameTarget = (a: DropTarget | null, b: DropTarget) => a?.index === b.index && a.indent === b.indent;

function draggedBlocks(controller: ViewController, blockId: string): string[] {
  const { state } = controller.editor;
  return state.doc.index.has(blockId) ? menuTargets(state, blockId) : [];
}

function followPress(press: HandlePress, root: HTMLElement, view: Window): () => void {
  const { controller, store, overlay, handle, pointerId } = press;
  const doc = view.document;
  const scroll = createAutoScroll(root, follow, SCROLL_EDGE);
  let pointer = { x: press.x, y: press.y };
  let active: ActiveDrag | null = null;
  let unsubscribe = () => {};
  let done = false;

  function begin(): void {
    const start = controller.editor.state.doc;
    const ids = draggedBlocks(controller, press.blockId);
    const layout = ids.length > 0 ? measureDrag(controller, root, ids) : null;
    if (layout === null) return finish();
    active = { ids, layout, target: null };
    handle.setPointerCapture(pointerId);
    overlay.show(layout.ghostShells, layout.ghost);
    unsubscribe = controller.editor.subscribe((state) => {
      if (state.doc !== start) finish();
    });
    press.onDragStart();
    follow();
  }

  function follow(): void {
    if (active === null) return;
    const { layout, ids } = active;
    const dx = pointer.x - press.x;
    const pointerY = pointer.y - rootOrigin(root).y;
    const { indentStep, blocks } = layout;
    const target = computeDropTarget({ pointerX: layout.draggedLeft + dx, pointerY, blocks, indentStep });
    overlay.follow(dx, pointer.y - press.y);
    overlay.mark({ top: target.lineTop, left: target.lineLeft, width: layout.right - target.lineLeft });
    if (!sameTarget(active.target, target)) {
      store.set({ drag: { blockIds: ids, targetIndex: target.index, targetIndent: target.indent } });
    }
    active.target = target;
  }

  function finish(): void {
    if (done) return;
    done = true;
    doc.removeEventListener('pointermove', onPointerMove);
    doc.removeEventListener('pointerup', onPointerUp);
    doc.removeEventListener('pointercancel', finish);
    view.removeEventListener('blur', finish);
    view.removeEventListener('keydown', onKeyDown, true);
    scroll.stop();
    unsubscribe();
    if (active === null) return;
    active = null;
    if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
    overlay.hide();
    store.set({ drag: null });
  }

  function drop(): void {
    const dropped = active;
    finish();
    if (dropped === null || dropped.target === null || controller.readOnly) return;
    const { ids, layout, target } = dropped;
    if (!controller.run(moveBlocksTo(ids, layout.toIndex(target.index), target.indent))) return;
    controller.focus();
    press.onMoved(ids[0]);
  }

  function onPointerMove(event: PointerEvent): void {
    if (event.pointerId !== pointerId) return;
    if ((event.buttons & 1) === 0) return drop();
    pointer = { x: event.clientX, y: event.clientY };
    if (active === null && Math.hypot(pointer.x - press.x, pointer.y - press.y) < DRAG_DISTANCE) return;
    if (active === null) begin();
    else follow();
    if (active !== null) scroll.update(pointer.y);
  }

  function onPointerUp(event: PointerEvent): void {
    if (event.pointerId === pointerId) drop();
  }

  // Taken before the editor sees it, where Escape would select the block holding the caret.
  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || active === null) return;
    event.preventDefault();
    event.stopPropagation();
    finish();
  }

  doc.addEventListener('pointermove', onPointerMove);
  doc.addEventListener('pointerup', onPointerUp);
  doc.addEventListener('pointercancel', finish);
  view.addEventListener('blur', finish);
  view.addEventListener('keydown', onKeyDown, true);
  return finish;
}

/**
 * Follows a press on a drag handle. It stays a click until the pointer travels 4 px, then drags the handle's block, and
 * the blocks selected with it, to the drop line. Returns what cancels it.
 */
export function pressDragHandle(press: HandlePress): () => void {
  const root = press.controller.root;
  const view = press.handle.ownerDocument.defaultView;
  return root === null || view === null ? () => {} : followPress(press, root, view);
}
