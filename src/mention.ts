'use client';

// The whole main entry, for the reason src/table.ts gives.
import './index';

export { mentionExtension, type MentionOptions } from './extensions/mention/mention-extension';
export type { Mention, MentionResult, MentionSearch } from './extensions/mention/mention-feature';
export { englishMentionLabels, type MentionLabels } from './extensions/mention/mention-labels';
