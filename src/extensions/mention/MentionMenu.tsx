'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuoin } from '../../context';
import { getPluginState } from '../../engine';
import { SuggestionMenu } from '../../menus/suggestion/SuggestionMenu';
import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import type { SuggestionRange } from '../ui-types';
import { chooseMention } from './choose-mention';
import type { MentionResult, MentionSearch } from './mention-feature';
import { mentionKey } from './mention-key';
import type { MentionLabels } from './mention-labels';
import { resultKey } from './mention-results';
import { createMentionSource } from './mention-source';
import { MentionItem } from './MentionItem';

type Props = { controller: ViewController; labels: MentionLabels; search: MentionSearch };

const renderItem = (result: MentionResult) => <MentionItem result={result} />;

/** The menu `@` opens on an editable canvas: what the host's search finds for the text typed after it. */
export function MentionMenu({ controller, labels, search }: Props) {
  const { onError } = useQuoin();
  const latest = useRef({ search, onError });
  useIsomorphicLayoutEffect(() => {
    latest.current = { search, onError };
  });
  // One source for the life of the menu, so a new render never asks again.
  const mentions = useMemo(
    () =>
      createMentionSource({
        search: (query) => latest.current.search(query),
        isAsked: (query) =>
          !controller.readOnly && getPluginState(controller.editor.state, mentionKey).active?.query === query,
        onError: (error) => latest.current.onError(error),
      }),
    [controller],
  );
  useEffect(() => mentions.cancel, [mentions]);
  const choose = useCallback(
    (result: MentionResult, range: SuggestionRange) => chooseMention(controller, result, range),
    [controller],
  );
  return (
    <SuggestionMenu
      controller={controller}
      pluginKey={mentionKey}
      items={mentions.source}
      itemKey={resultKey}
      renderItem={renderItem}
      onSelect={choose}
      label={labels.mentionMenu}
      emptyLabel={labels.noMatches}
      pendingLabel={labels.searching}
    />
  );
}
