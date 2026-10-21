'use client';

import { defineExtension, type Extension } from '../../engine';
import { suggestionPlugin } from '../../menus/suggestion/suggestion-plugin';
import type { ViewController } from '../../view';
import type { ExtensionUI } from '../ui-types';
import { CalloutIconPicker } from './CalloutIconPicker';
import { chooseIconAction } from './choose-icon-action';
import { emojiKey } from './emoji-key';
import { resolveEmojiLabels, type EmojiLabels } from './emoji-labels';
import { EmojiMenu } from './EmojiMenu';

export type EmojiOptions = {
  /** Every string the feature shows or speaks, English by default. A key left out stays English. */
  labels?: Partial<EmojiLabels>;
};

/**
 * Emoji: `:` and two characters of a shortcode open a menu of the emoji that match, and the chosen one goes in as text
 * in place of the `:` and the query. The block menu of a callout offers a picker of every emoji for its icon. The
 * dataset loads on demand, the first time the menu or the picker opens.
 */
export function emojiExtension(options: EmojiOptions = {}): Extension {
  const labels = resolveEmojiLabels(options.labels);
  const Menu = ({ controller }: { controller: ViewController }) => <EmojiMenu controller={controller} labels={labels} />;
  const Picker = ({ controller }: { controller: ViewController }) => (
    <CalloutIconPicker controller={controller} labels={labels} />
  );
  const ui: ExtensionUI = { blockMenuItems: [chooseIconAction(labels)], overlays: [Menu, Picker] };
  return defineExtension({ name: 'emoji', plugins: [suggestionPlugin(emojiKey, { char: ':' })], ui });
}
