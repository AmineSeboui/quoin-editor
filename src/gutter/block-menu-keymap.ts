import type { CanvasUiStore } from '../canvas/ui-store';
import { defineExtension, type Command, type Extension } from '../engine';
import { headBlockId } from '../engine/commands/block-helpers';
import { openBlockMenu } from './block-menu-state';

/** Mod+/ opens the block menu for the block holding the selection head, from the gutter beside it. */
export function blockMenuKeymap(store: CanvasUiStore): Extension {
  const openForHead: Command = (state, dispatch) => {
    const head = headBlockId(state.selection);
    if (head === null || !state.doc.index.has(head)) return false;
    if (dispatch) openBlockMenu(store, state, head);
    return true;
  };
  return defineExtension({ name: 'block-menu', keymap: { 'Mod-/': openForHead } });
}
