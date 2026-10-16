'use client';

import { useCallback } from 'react';
import type { SlashItem, SuggestionRange } from '../../extensions/ui-types';
import { MenuIcon } from '../../gutter/MenuIcon';
import { shortcutHint } from '../../gutter/shortcut-hint';
import type { QuoinLabels } from '../../i18n/labels';
import type { ViewController } from '../../view';
import { SuggestionMenu } from '../suggestion/SuggestionMenu';
import { chooseSlashItem } from './choose-slash-item';
import { fuzzyFilter } from './fuzzy';
import { slashKey } from './slash-key';

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

/** The `/` menu: the commands that match the query after the slash, grouped under their headings. */
export function SlashMenu({ controller, labels, items }: SlashMenuProps) {
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
  const choose = useCallback(
    (item: SlashItem, range: SuggestionRange) => chooseSlashItem(controller, item, range),
    [controller],
  );
  return (
    <SuggestionMenu
      controller={controller}
      pluginKey={slashKey}
      items={search}
      itemKey={itemKey}
      renderItem={renderItem}
      groupOf={groupOf}
      onSelect={choose}
      label={labels.slashMenu}
      emptyLabel={labels.noResults}
    />
  );
}
