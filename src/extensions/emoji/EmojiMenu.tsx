'use client';

import { useCallback, useMemo, useState } from 'react';
import { getPluginState, insertText, type EditorState } from '../../engine';
import type { Emoji } from '../../emoji/emoji-types';
import { replaceTrigger } from '../../menus/suggestion/replace-trigger';
import { SuggestionMenu } from '../../menus/suggestion/SuggestionMenu';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useReadOnly } from '../../view/react/use-read-only';
import type { SuggestionRange } from '../ui-types';
import { emojiKey } from './emoji-key';
import type { EmojiLabels } from './emoji-labels';
import { emojiName } from './emoji-name';
import { emojiSource } from './emoji-source';

type Props = { controller: ViewController; labels: EmojiLabels };

const SHOWN = 8;
const SHORTEST_QUERY = 2;

const queryAt = (state: EditorState) => getPluginState(state, emojiKey).active?.query ?? null;

const emojiOf = ({ emoji }: Emoji) => emoji;

const renderEmoji = (emoji: Emoji) => (
  <>
    <span aria-hidden="true" className="text-base">
      {emoji.emoji}
    </span>
    <span className="truncate">{emojiName(emoji)}</span>
  </>
);

/** The menu `:` opens on an editable canvas, once two characters follow it: the emoji that match them. */
export function EmojiMenu({ controller, labels }: Props) {
  const readOnly = useReadOnly(controller);
  const query = useEditorState(controller, queryAt);
  if (readOnly || query === null || query.length < SHORTEST_QUERY) return null;
  return <EmojiMatches controller={controller} labels={labels} />;
}

// Mounted while the menu is open, so a menu that opens again starts with a source that loads the dataset again.
function EmojiMatches({ controller, labels }: Props) {
  const [failed, setFailed] = useState(false);
  const source = useMemo(() => emojiSource(SHOWN, () => setFailed(true)), []);
  const choose = useCallback(
    (emoji: Emoji, range: SuggestionRange) => void replaceTrigger(controller, range, insertText(emoji.emoji)),
    [controller],
  );
  return (
    <SuggestionMenu
      controller={controller}
      pluginKey={emojiKey}
      items={source}
      itemKey={emojiOf}
      renderItem={renderEmoji}
      onSelect={choose}
      label={labels.emojiMenu}
      emptyLabel={failed ? labels.loadFailed : labels.noMatches}
      pendingLabel={labels.loading}
    />
  );
}
