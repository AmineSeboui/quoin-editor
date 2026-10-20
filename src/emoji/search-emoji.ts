import { ALL_EMOJI } from './all-emoji';
import type { Emoji } from './emoji-types';

const MATCHES = 4;

// The place of the emoji among the matches of the query, best first, or null when it is no match.
function matchOf({ shortcodes, tags }: Emoji, query: string): number | null {
  if (shortcodes.includes(query)) return 0;
  if (shortcodes.some((code) => code.startsWith(query))) return 1;
  if (tags.some((tag) => tag.startsWith(query))) return 2;
  return shortcodes.some((code) => code.includes(query)) || tags.some((tag) => tag.includes(query)) ? 3 : null;
}

/**
 * The emoji that match the query, whatever its case, at most `limit` of them: first those with a shortcode that is the
 * query, then with a shortcode that starts with it, then with a tag that starts with it, then with a shortcode or a tag
 * that holds it, each in the order of the dataset. An empty query matches every emoji.
 */
export function searchEmoji(query: string, limit = Number.POSITIVE_INFINITY): readonly Emoji[] {
  const wanted = query.trim().toLowerCase();
  const most = Math.max(0, limit);
  if (wanted === '') return ALL_EMOJI.slice(0, most);
  const matches: Emoji[][] = Array.from({ length: MATCHES }, () => []);
  for (const emoji of ALL_EMOJI) {
    const at = matchOf(emoji, wanted);
    if (at !== null) matches[at].push(emoji);
  }
  return matches.flat().slice(0, most);
}
