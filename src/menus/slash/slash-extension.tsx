'use client';

import { useCallback } from 'react';
import { createPluginKey, defineExtension, type Extension } from '../../engine';
import type { SlashItem, SuggestionRange } from '../../extensions/ui-types';
import { MenuIcon } from '../../gutter/MenuIcon';
import { shortcutHint } from '../../gutter/shortcut-hint';
import type { QuoinLabels } from '../../i18n/labels';
import type { ViewController } from '../../view';
import { SuggestionMenu } from '../suggestion/SuggestionMenu';
import { suggestionPlugin, type SuggestionState } from '../suggestion/suggestion-plugin';
import { fuzzyFilter } from './fuzzy';
import { builtInSlashItems } from './slash-items';

export const slashKey = createPluginKey<SuggestionState>('slash');

const itemKey = (item: SlashItem) => item.id;

type SlashRowProps = { item: SlashItem; isMac: boolean; keyNames: QuoinLabels['keyNames'] };

function SlashRow({ item, isMac, keyNames }: SlashRowProps) {
  const hint = item.shortcut === undefined ? null : shortcutHint(item.shortcut, isMac, keyNames);
  return (
    <>
      {item.icon !== undefined && <MenuIcon icon={item.icon} />}
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{item.title}</span>
        {item.description !== undefined && (
          <span className="truncate text-xs text-muted-foreground">{item.description}</span>
        )}
      </span>
      {hint !== null && (
        <kbd aria-hidden="true" className="ml-auto font-sans text-xs tracking-widest text-muted-foreground pointer-coarse:hidden">
          {hint.text}
        </kbd>
      )}
    </>
  );
}

type SlashMenuProps = { controller: ViewController; labels: QuoinLabels; items: readonly SlashItem[] };

function SlashMenu({ controller, labels, items }: SlashMenuProps) {
  const search = useCallback(
    (query: string) => {
      const { state } = controller.editor;
      return fuzzyFilter(
        items.filter((item) => item.available?.(state) ?? true),
        query,
      );
    },
    [controller, items],
  );
  const groupOf = useCallback((item: SlashItem) => labels.groups[item.group], [labels]);
  const renderItem = useCallback(
    (item: SlashItem) => <SlashRow item={item} isMac={controller.isMac} keyNames={labels.keyNames} />,
    [controller, labels],
  );
  const run = useCallback((item: SlashItem, range: SuggestionRange) => item.run({ controller, range }), [controller]);
  return (
    <SuggestionMenu
      controller={controller}
      pluginKey={slashKey}
      items={search}
      itemKey={itemKey}
      renderItem={renderItem}
      groupOf={groupOf}
      onSelect={run}
      label={labels.slashMenu}
      emptyLabel={labels.noResults}
    />
  );
}

/**
 * The `/` menu of block commands: the built-in ones, then `extraItems`, which are the commands other extensions add and
 * those of the registered block types.
 */
export function slashExtension(labels: QuoinLabels, extraItems: readonly SlashItem[]): Extension {
  const items = [...builtInSlashItems(labels), ...extraItems];
  const BoundSlashMenu = ({ controller }: { controller: ViewController }) => (
    <SlashMenu controller={controller} labels={labels} items={items} />
  );
  return defineExtension({
    name: 'slash',
    plugins: [suggestionPlugin(slashKey, { char: '/' })],
    ui: { overlays: [BoundSlashMenu] },
  });
}
