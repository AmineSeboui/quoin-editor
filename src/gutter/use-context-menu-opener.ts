import { useEffect, type RefObject } from 'react';
import type { CanvasUiStore } from '../canvas/ui-store';
import { isTextFlow } from '../engine/commands/block-helpers';
import { blockById } from '../engine/model/doc';
import type { ViewController } from '../view';
import { NATIVE_INTERACTION } from '../view/selection/native-interaction';
import { menuTargets } from './block-menu-items';

/** Marks the gutter, and names the block it stands beside. */
export const GUTTER_BLOCK = 'data-quoin-gutter-block';

const OWN_MENU = `[${NATIVE_INTERACTION}], input, textarea, select`;

// A right-click in text keeps the browser's menu, which holds the spelling suggestions. The block menu takes the
// right-click on the gutter, on a block with no text and anywhere while whole blocks are selected.
function contextTargets(controller: ViewController, target: Element): string[] | null {
  const { state } = controller.editor;
  const gutter = target.closest(`[${GUTTER_BLOCK}]`)?.getAttribute(GUTTER_BLOCK);
  if (gutter) return state.doc.index.has(gutter) ? menuTargets(state, gutter) : null;
  const { selection } = state;
  if (selection?.kind === 'blocks') return menuTargets(state, selection.head);
  if (target.closest(OWN_MENU) || controller.registry.locate(target) !== null) return null;
  const id = controller.blockAt(target);
  const block = id === undefined ? undefined : blockById(state.doc, id);
  return block === undefined || isTextFlow(state.schema, block) ? null : menuTargets(state, block.id);
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
    const targetsOf = (event: MouseEvent) =>
      event.target === trigger.current || controller.readOnly ? null : contextTargets(controller, event.target as Element);

    // A right press would otherwise move focus and the caret first, and the selected blocks with them.
    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 2 && targetsOf(event) !== null) event.preventDefault();
    };
    const onContextMenu = (event: MouseEvent) => {
      const blockIds = targetsOf(event);
      const hidden = trigger.current;
      if (blockIds === null || hidden === null) return;
      event.preventDefault();
      const { clientX, clientY } = event;
      store.set({ blockMenu: { blockIds, anchor: 'pointer', x: clientX, y: clientY } });
      hidden.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY }));
    };

    root.addEventListener('mousedown', onMouseDown);
    root.addEventListener('contextmenu', onContextMenu);
    return () => {
      root.removeEventListener('mousedown', onMouseDown);
      root.removeEventListener('contextmenu', onContextMenu);
    };
  }, [controller, store, trigger]);
}
