'use client';

import { createContext, useContext, useMemo } from 'react';
import { useCanvasUiStore } from '../../canvas/ui-store';
import { defineExtension, type Extension } from '../../engine';
import type { ToolbarItem } from '../../extensions/ui-types';
import { useLabels } from '../../i18n/use-labels';
import type { ViewController } from '../../view';
import { BubbleToolbar } from './BubbleToolbar';
import { readOnlyItems } from '../../toolbar/read-only-items';
import { useReadOnly } from '../../view/react/use-read-only';
import { useBubbleVisibility } from './use-bubble-visibility';

const NO_ITEMS: readonly ToolbarItem[] = [];

const BubbleItemsContext = createContext<readonly ToolbarItem[]>(NO_ITEMS);

/** The buttons the bubble toolbar shows after its built-in ones, which a canvas may change while it is open. */
export const BubbleItemsProvider = BubbleItemsContext.Provider;

/** The buttons extensions add to the bubble toolbar; the mobile toolbar of a read-only canvas shows them too. */
export const useBubbleItems = (): readonly ToolbarItem[] => useContext(BubbleItemsContext);

// One component for every toolbar, reading its labels and buttons from context: a new list never remounts it.
function BubbleOverlay({ controller }: { controller: ViewController }) {
  const items = useBubbleItems();
  const readOnly = useReadOnly(controller);
  const extraItems = useMemo(() => (readOnly ? readOnlyItems(items) : items), [readOnly, items]);
  const visible = useBubbleVisibility(controller, items);
  const labels = useLabels();
  const store = useCanvasUiStore();
  if (!visible) return null;
  // Keyed apart, so turning read-only remounts the toolbar and focus held on a tool that went goes back to the text.
  return (
    <BubbleToolbar
      key={readOnly ? 'reader' : 'writer'}
      controller={controller}
      labels={labels}
      store={store}
      extraItems={extraItems}
      readOnly={readOnly}
    />
  );
}

/** The formatting toolbar over selected text, with the buttons a `BubbleItemsProvider` adds. */
export function bubbleExtension(): Extension {
  return defineExtension({ name: 'bubble', ui: { overlays: [BubbleOverlay] } });
}
