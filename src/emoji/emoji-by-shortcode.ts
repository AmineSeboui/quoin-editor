import { ALL_EMOJI } from './all-emoji';
import type { Emoji } from './emoji-types';

let byShortcode: ReadonlyMap<string, Emoji> | null = null;

function shortcodeIndex(): ReadonlyMap<string, Emoji> {
  const index = new Map<string, Emoji>();
  for (const emoji of ALL_EMOJI) {
    for (const code of emoji.shortcodes) if (!index.has(code)) index.set(code, emoji);
  }
  return index;
}

/** The emoji one of whose shortcodes is `code`, whatever its case, written without colons. */
export function emojiByShortcode(code: string): Emoji | undefined {
  byShortcode ??= shortcodeIndex();
  return byShortcode.get(code.trim().toLowerCase());
}
