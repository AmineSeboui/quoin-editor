import type { CanvasUiStore } from '../canvas/ui-store';
import type { EditorState } from '../engine';
import { menuTargets } from './block-menu-items';

/** Opens the block menu from the gutter of `blockId`, which stays beside that block while the menu is open. */
export function openBlockMenu(store: CanvasUiStore, state: EditorState, blockId: string): void {
  store.set({ hoveredBlock: blockId, blockMenu: { blockIds: menuTargets(state, blockId), anchor: 'handle' } });
}

/** Closes either block menu. The gutter goes back to the block being edited until the pointer moves again. */
export function closeBlockMenu(store: CanvasUiStore): void {
  store.set({ blockMenu: null, hoveredBlock: null });
}
