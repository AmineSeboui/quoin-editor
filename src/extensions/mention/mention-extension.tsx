'use client';

import { defineExtension, type Extension } from '../../engine';
import { suggestionPlugin } from '../../menus/suggestion/suggestion-plugin';
import type { ViewController } from '../../view';
import { atomKeymap } from '../atoms/atom-keymap';
import { selectedAtomDecorations } from '../atoms/selected-atom-decorations';
import type { ExtensionUI } from '../ui-types';
import { MENTION_ATOMS, type Mention, type MentionFeature, type MentionSearch } from './mention-feature';
import { mentionKey } from './mention-key';
import { resolveMentionLabels, type MentionLabels } from './mention-labels';
import { mentionChipRenderer } from './MentionChip';
import { MentionOverlay } from './MentionOverlay';

export type MentionOptions = {
  /**
   * Finds what to mention for the text typed after `@`, asked once typing has rested for 120 ms. An answer to a query
   * typed past is dropped, and one that throws or rejects shows no matches and reaches `onError`. Without it `@` opens
   * nothing, and the mentions in the document are still drawn.
   */
  search?: MentionSearch;
  /** Called with a mention whose chip is clicked, or that is selected when Enter is pressed. Without it chips stay text. */
  onOpen?: (mention: Mention) => void;
  /** Every string the feature shows or speaks, English by default. A key left out stays English. */
  labels?: Partial<MentionLabels>;
};

// Above the core keys, so that Backspace right after a mention selects it before the core one would delete it.
const ABOVE_CORE_KEYS = 200;

/**
 * Mentions: `@` opens a menu of what the host's search finds, the chosen one goes in as a mention followed by a space,
 * and mentions are drawn as chips, which hand themselves to the host's `onOpen`.
 */
export function mentionExtension(options: MentionOptions = {}): Extension {
  const { search, onOpen } = options;
  const feature: MentionFeature = { labels: resolveMentionLabels(options.labels), search, onOpen };
  const Overlay = ({ controller }: { controller: ViewController }) => (
    <MentionOverlay controller={controller} feature={feature} />
  );
  const ui: ExtensionUI = { render: { atoms: { mention: mentionChipRenderer(feature) } }, overlays: [Overlay] };
  return defineExtension({
    name: 'mention',
    priority: ABOVE_CORE_KEYS,
    plugins: search === undefined ? [] : [suggestionPlugin(mentionKey, { char: '@', allowSpaces: true })],
    keymap: atomKeymap(MENTION_ATOMS),
    decorations: selectedAtomDecorations(MENTION_ATOMS),
    ui,
  });
}
