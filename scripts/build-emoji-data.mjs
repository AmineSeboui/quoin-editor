import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EMOJI_DATA_FILE, generateEmojiData } from './emoji-data.mjs';

const root = resolve(import.meta.dirname, '..');
writeFileSync(resolve(root, EMOJI_DATA_FILE), generateEmojiData(root));
console.log(`${EMOJI_DATA_FILE} holds the emoji of the installed emojibase-data.`);
