import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { getPluginState, type EditorState, type PluginKey } from '../../engine';
import type { SuggestionRange } from '../../extensions/ui-types';
import { useQuoin } from '../../context';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useReadOnly } from '../../view/react/use-read-only';
import { useComboboxHost } from './combobox-attributes';
import type { ActiveTrigger } from './find-trigger';
import { groupItems, type SuggestionSection } from './group-items';
import { dismissSuggestion, type SuggestionState } from './suggestion-plugin';
import { useSuggestionKeys } from './use-suggestion-keys';
import { useSuggestionResults, type SuggestionSource } from './use-suggestion-results';

const SETTLE_MS = 150;

export type SuggestionOptions<T> = {
  controller: ViewController;
  pluginKey: PluginKey<SuggestionState>;
  items: SuggestionSource<T>;
  itemKey(item: T): string;
  groupOf?(item: T): string | null;
  onSelect(item: T, range: SuggestionRange): void;
  emptyLabel: string;
};

export type Suggestion<T> = {
  trigger: ActiveTrigger | null;
  sections: SuggestionSection<T>[];
  pending: boolean;
  activeIndex: number;
  listboxId: string;
  optionId(item: T): string;
  highlight(index: number): void;
  select(index: number): void;
  dismiss(): void;
};

const rangeOf = ({ block, region, from, to }: SuggestionRange): SuggestionRange => ({ block, region, from, to });

// Option ids carry the item's key, so the active descendant changes whenever the active item does, even at one index.
const idPart = (key: string) => key.replace(/[^a-zA-Z0-9-]/g, (character) => `_${character.charCodeAt(0).toString(16)}`);

export function useSuggestion<T>({
  controller,
  pluginKey,
  items: source,
  itemKey,
  groupOf,
  onSelect,
  emptyLabel,
}: SuggestionOptions<T>): Suggestion<T> {
  const { labels, onError } = useQuoin();
  const readOnly = useReadOnly(controller);
  const selectTrigger = useCallback((state: EditorState) => getPluginState(state, pluginKey).active, [pluginKey]);
  const active = useEditorState(controller, selectTrigger);
  const trigger = readOnly ? null : active;
  const results = useSuggestionResults(source, trigger?.query ?? null, onError);
  const sections = useMemo(() => groupItems(results.items, groupOf), [results.items, groupOf]);
  const ordered = useMemo(() => sections.flatMap((section) => section.entries.map(({ item }) => item)), [sections]);
  const [highlighted, setHighlighted] = useState<{ ordered: readonly T[]; index: number } | null>(null);
  const activeIndex = highlighted?.ordered === ordered ? highlighted.index : 0;
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = useCallback((item: T) => `${baseId}-option-${idPart(itemKey(item))}`, [baseId, itemKey]);
  const activeId = activeIndex < ordered.length ? optionId(ordered[activeIndex]) : null;

  const highlight = useCallback(
    (index: number) => setHighlighted((last) => (last?.ordered === ordered && last.index === index ? last : { ordered, index })),
    [ordered],
  );
  const select = useCallback(
    (index: number) => {
      const current = getPluginState(controller.editor.state, pluginKey).active;
      if (current !== null && index < ordered.length) onSelect(ordered[index], rangeOf(current));
    },
    [controller, pluginKey, ordered, onSelect],
  );
  const dismiss = useCallback(() => void controller.run(dismissSuggestion(pluginKey)), [controller, pluginKey]);

  useSuggestionKeys(controller, trigger !== null, { count: ordered.length, activeIndex, highlight, select, dismiss });

  useComboboxHost(controller, trigger?.block ?? null, trigger?.region ?? null, listboxId, activeId);

  const query = trigger?.query ?? null;
  useEffect(() => {
    if (query === null || results.pending) return;
    const count = ordered.length;
    const timer = setTimeout(() => controller.announcer.announce(count === 0 ? emptyLabel : labels.resultCount(count)), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [controller, query, ordered, results.pending, emptyLabel, labels]);

  return { trigger, sections, pending: results.pending, activeIndex, listboxId, optionId, highlight, select, dismiss };
}
