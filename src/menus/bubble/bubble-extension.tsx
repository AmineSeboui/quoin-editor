'use client';

import { createContext, useContext } from 'react';
import { useCanvasUiStore } from '../../canvas/ui-store';
import { defineExtension, type Extension } from '../../engine';
import type { ToolbarItem } from '../../extensions/ui-types';
import { useLabels } from '../../i18n/use-labels';
import type { ViewController } from '../../view';
import { BubbleToolbar } from './BubbleToolbar';
import { useBubbleVisibility } from './use-bubble-visibility';

const NO_ITEMS: readonly ToolbarItem[] = [];

const BubbleItemsContext = createContext<readonly ToolbarItem[]>(NO_ITEMS);

/** The buttons the bubble toolbar shows after its built-in ones, which a canvas may change while it is open. */
export const BubbleItemsProvider = BubbleItemsContext.Provider;

// One component for every toolbar, reading its labels and buttons from context: a new list never remounts it.
function BubbleOverlay({ controller }: { controller: ViewController }) {
  const visible = useBubbleVisibility(controller);
  const labels = useLabels();
  const store = useCanvasUiStore();
  const extraItems = useContext(BubbleItemsContext);
  if (!visible) return null;
  return <BubbleToolbar controller={controller} labels={labels} store={store} extraItems={extraItems} />;
}

/** The formatting toolbar over selected text, with the buttons a `BubbleItemsProvider` adds. */
export function bubbleExtension(): Extension {
  return defineExtension({ name: 'bubble', ui: { overlays: [BubbleOverlay] } });
}
