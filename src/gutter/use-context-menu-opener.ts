import { useEffect, type RefObject } from 'react';
import type { CanvasUiStore } from '../canvas/ui-store';
import { isTextFlow } from '../engine/commands/block-helpers';
import { blockById } from '../engine/model/doc';
import type { ViewController } from '../view';
import { listen } from '../view/dom/listen';
import { NATIVE_INTERACTION } from '../view/selection/native-interaction';
import { openBlockMenuAt } from './block-menu-state';

export const GUTTER_BLOCK = 'data-quoin-gutter-block';

const OWN_MENU = `[${NATIVE_INTERACTION}], input, textarea, select`;

// A right-click in text keeps the browser's menu, which holds the spelling suggestions. The block menu takes the
// right-click on the gutter, on a block with no text and anywhere while whole blocks are selected.
function contextBlock(controller: ViewController, target: Element): string | null {
  const { state } = controller.editor;
  const gutter = target.closest(`[${GUTTER_BLOCK}]`)?.getAttribute(GUTTER_BLOCK);
  if (gutter) return state.doc.index.has(gutter) ? gutter : null;
  const { selection } = state;
  if (selection?.kind === 'blocks') return selection.head;
  if (target.closest(OWN_MENU) || controller.registry.locate(target) !== null) return null;
  const id = controller.blockAt(target);
  const block = id === undefined ? undefined : blockById(state.doc, id);
  return block === undefined || isTextFlow(state.schema, block) ? null : block.id;
}

/**
 * Opens the block menu at the pointer on a right-click it takes. Radix opens a context menu only from a contextmenu
 * event on its trigger, so the event is passed on to the hidden trigger once the targets are in the store.
 */
export function useContextMenuOpener(
  controller: ViewController,
  store: CanvasUiStore,
  trigger: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const root = controller.root;
    if (root === null) return;
    const blockOf = (event: MouseEvent) =>
      event.target === trigger.current || controller.readOnly ? null : contextBlock(controller, event.target as Element);

    // A right press would otherwise move focus and the caret first, and the selected blocks with them.
    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 2 && blockOf(event) !== null) event.preventDefault();
    };
    // A right press on the handle while its menu is open closes the menu, which hides the gutter before contextmenu
    // arrives, so that event lands on the editor behind it. The block is read at the press.
    let pressed: { block: string; x: number; y: number } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      const block = event.button === 2 ? blockOf(event) : null;
      pressed = block === null ? null : { block, x: event.clientX, y: event.clientY };
    };
    const pressedAt = ({ clientX, clientY }: MouseEvent) =>
      pressed !== null && Math.hypot(clientX - pressed.x, clientY - pressed.y) <= 2 ? pressed.block : null;
    const onContextMenu = (event: MouseEvent) => {
      const block = blockOf(event) ?? pressedAt(event);
      pressed = null;
      const hidden = trigger.current;
      if (block === null || hidden === null) return;
      event.preventDefault();
      const { clientX, clientY } = event;
      openBlockMenuAt(store, controller.editor.state, block, clientX, clientY);
      hidden.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY }));
    };

    return listen(root, { pointerdown: onPointerDown, mousedown: onMouseDown, contextmenu: onContextMenu });
  }, [controller, store, trigger]);
}
