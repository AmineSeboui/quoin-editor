'use client';

import { useCanvasUi, useCanvasUiStore, type CanvasUiState, type CanvasUiStore } from '../../canvas/ui-store';
import { defineExtension, type Command, type Extension } from '../../engine';
import { useLabels } from '../../i18n/use-labels';
import type { ViewController } from '../../view';
import { useReadOnly } from '../../view/react/use-read-only';
import { LinkHoverCard } from './LinkHoverCard';
import { LinkPopover } from './LinkPopover';
import { useLinkClicks } from './use-link-clicks';

const isPopoverOpen = (state: CanvasUiState) => state.linkPopover.open;

// One component for every canvas, reading its labels and the store from context: new labels never remount it.
function LinkOverlay({ controller }: { controller: ViewController }) {
  const labels = useLabels();
  const store = useCanvasUiStore();
  const popoverOpen = useCanvasUi(store, isPopoverOpen);
  const readOnly = useReadOnly(controller);
  useLinkClicks(controller);
  if (readOnly) return null;
  if (!popoverOpen) return <LinkHoverCard controller={controller} labels={labels} store={store} />;
  return <LinkPopover controller={controller} labels={labels} onClose={() => store.set({ linkPopover: { open: false } })} />;
}

/**
 * Mod+K, like the toolbar's Link, opens the link popover on the store, and links in the text get a hover card and open
 * in a new tab on Mod+click.
 */
export function linkExtension(store: CanvasUiStore): Extension {
  const openPopover: Command = (state, dispatch) => {
    if (state.selection?.kind !== 'text') return false;
    if (dispatch) store.set({ linkPopover: { open: true } });
    return true;
  };
  return defineExtension({ name: 'link', keymap: { 'Mod-k': openPopover }, ui: { overlays: [LinkOverlay] } });
}
