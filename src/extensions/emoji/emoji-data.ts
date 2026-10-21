import type { emojiByShortcode, searchEmoji, skinTones } from '../../emoji/index';
import { lazyLoad } from './lazy-load';

/** The emoji dataset and its search, loaded on demand. */
export type EmojiData = {
  readonly searchEmoji: typeof searchEmoji;
  readonly emojiByShortcode: typeof emojiByShortcode;
  readonly skinTones: typeof skinTones;
};

// `emoji/index`, as `emoji` alone is the entry beside the directory. Only this dynamic import reaches the dataset, which
// so builds into a chunk of its own that no entry holds.
const importEmojiData = (): Promise<EmojiData> =>
  import('../../emoji/index').then(({ searchEmoji, emojiByShortcode, skinTones }) => ({
    searchEmoji,
    emojiByShortcode,
    skinTones,
  }));

export const emojiData = lazyLoad(importEmojiData);

/**
 * Loads the emoji dataset, about 1,900 emoji with their GitHub shortcodes and tags, the first time it is called, and
 * again after a load that failed. The `:` menu and the picker call it when they first open.
 */
export const loadEmojiData = (): Promise<EmojiData> => emojiData.load();
