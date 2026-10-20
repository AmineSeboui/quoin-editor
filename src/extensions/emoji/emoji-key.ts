import { createPluginKey } from '../../engine';
import type { SuggestionState } from '../../menus/suggestion/suggestion-plugin';

export const emojiKey = createPluginKey<SuggestionState>('emoji');
