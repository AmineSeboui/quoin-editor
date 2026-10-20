import type { Emoji } from '../../emoji/emoji-types';

/** What an emoji is called in the menu and the picker: its first shortcode, or for a new emoji with none its first tag. */
export const emojiName = ({ shortcodes, tags }: Emoji): string => shortcodes[0] ?? tags[0] ?? '';
