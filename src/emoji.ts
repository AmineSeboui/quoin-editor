'use client';

// The whole main entry, for the reason src/table.ts gives.
import './index';

export { emojiExtension, type EmojiOptions } from './extensions/emoji/emoji-extension';
export { loadEmojiData, type EmojiData } from './extensions/emoji/emoji-data';
export { englishEmojiLabels, type EmojiLabels } from './extensions/emoji/emoji-labels';
export type { Emoji, EmojiGroup } from './emoji/emoji-types';
