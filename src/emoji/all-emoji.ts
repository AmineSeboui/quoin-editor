import { EMOJI_ROWS } from './data';
import type { Emoji } from './emoji-types';

/** Every emoji of the dataset, in its order, which runs group by group. */
export const ALL_EMOJI: readonly Emoji[] = EMOJI_ROWS.map(([emoji, shortcodes, tags, group]) => ({
  emoji,
  shortcodes,
  tags,
  group,
}));
