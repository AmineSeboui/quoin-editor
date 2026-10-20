import type { Emoji } from '../../emoji/emoji-types';
import type { SuggestionSource } from '../../menus/suggestion/use-suggestion-results';
import { emojiData } from './emoji-data';

/**
 * The menu's source of the `limit` best matches, which answers at once when the dataset has loaded and otherwise once it
 * loads. After a load fails it answers no matches without loading again: a menu that opens again makes a new source.
 */
export function emojiSource(limit: number, onFailure: () => void): SuggestionSource<Emoji> {
  let failed = false;
  return (query) => {
    const data = emojiData.loaded();
    if (data !== undefined) return data.searchEmoji(query, limit);
    if (failed) return [];
    return emojiData.load().then(
      (loaded) => loaded.searchEmoji(query, limit),
      (reason: unknown) => {
        failed = true;
        onFailure();
        throw reason;
      },
    );
  };
}
