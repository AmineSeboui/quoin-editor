import { createPluginKey } from '../../engine';
import type { SuggestionState } from '../suggestion/suggestion-plugin';

export const slashKey = createPluginKey<SuggestionState>('slash');
