'use client';

import { createContext, useContext, useMemo } from 'react';
import { defineExtension, type Extension } from '../../engine';
import type { SlashItem } from '../../extensions/ui-types';
import { useLabels } from '../../i18n/use-labels';
import type { ViewController } from '../../view';
import { suggestionPlugin } from '../suggestion/suggestion-plugin';
import { slashKey } from './slash-key';
import { builtInSlashItems } from './slash-items';
import { SlashMenu } from './SlashMenu';

const NO_ITEMS: readonly SlashItem[] = [];

const SlashItemsContext = createContext<readonly SlashItem[]>(NO_ITEMS);

/** The commands the slash menu offers after its built-in ones, which a canvas may change while the menu is open. */
export const SlashItemsProvider = SlashItemsContext.Provider;

// One component for every menu, reading its labels and commands from context: a new list never remounts an open menu.
function SlashOverlay({ controller }: { controller: ViewController }) {
  const labels = useLabels();
  const extraItems = useContext(SlashItemsContext);
  const items = useMemo(() => [...builtInSlashItems(labels), ...extraItems], [labels, extraItems]);
  return <SlashMenu controller={controller} labels={labels} items={items} />;
}

/** The `/` trigger and the overlay that draws its menu of the built-in commands and those a `SlashItemsProvider` adds. */
export function slashExtension(): Extension {
  return defineExtension({
    name: 'slash',
    plugins: [suggestionPlugin(slashKey, { char: '/' })],
    ui: { overlays: [SlashOverlay] },
  });
}
