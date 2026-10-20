'use client';

import { Keyboard } from 'lucide-react';
import { returnFocusToText } from '../blocks/text/return-focus-to-text';
import { useCanvasUi, useCanvasUiStore, type CanvasUiState, type CanvasUiStore } from '../canvas/ui-store';
import { defineExtension, type Command, type Extension } from '../engine';
import type { SlashItem } from '../extensions/ui-types';
import type { QuoinLabels } from '../i18n/labels';
import { useLabels } from '../i18n/use-labels';
import type { ViewController } from '../view';
import { ShortcutsDialog } from './ShortcutsDialog';

const SHORTCUT = 'Mod-Shift-/';

const isOpen = (state: CanvasUiState) => state.shortcutsOpen;

// One component for every canvas, reading its labels and the store from context: new labels never remount it.
function ShortcutsOverlay({ controller }: { controller: ViewController }) {
  const labels = useLabels();
  const store = useCanvasUiStore();
  const open = useCanvasUi(store, isOpen);
  return (
    <ShortcutsDialog
      open={open}
      onOpenChange={(next) => store.set({ shortcutsOpen: next })}
      labels={labels}
      isMac={controller.isMac}
      onCloseAutoFocus={returnFocusToText(controller)}
    />
  );
}

/** The slash command that opens the keyboard shortcuts dialog once the menu has removed the slash and the query. */
export function shortcutsSlashItem(labels: QuoinLabels, store: CanvasUiStore): SlashItem {
  return {
    id: 'shortcuts',
    title: labels.shortcuts,
    group: 'advanced',
    icon: Keyboard,
    keywords: ['keyboard', 'keys', 'hotkeys', 'help', '?'],
    shortcut: SHORTCUT,
    run: () => store.set({ shortcutsOpen: true }),
  };
}

/**
 * Mod+Shift+/ opens the keyboard shortcuts dialog on the store. Shift and the slash type a question mark on a US
 * keyboard, so Mod+Shift+? is bound as well.
 */
export function shortcutsExtension(store: CanvasUiStore): Extension {
  const open: Command = (_state, dispatch) => {
    if (dispatch) store.set({ shortcutsOpen: true });
    return true;
  };
  return defineExtension({
    name: 'shortcuts',
    keymap: { [SHORTCUT]: open, 'Mod-Shift-?': open },
    ui: { overlays: [ShortcutsOverlay] },
  });
}
