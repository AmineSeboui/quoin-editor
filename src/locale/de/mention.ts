import type { MentionLabels } from '../../extensions/mention/mention-labels';

/** Every string the mention feature shows or speaks, in German. */
export const deMentionLabels: MentionLabels = {
  mentionMenu: 'Erwähnungen',
  searching: 'Wird gesucht…',
  noMatches: 'Keine Treffer',
  mentionDescription: (kind) => (kind === undefined ? 'Erwähnung' : `Erwähnung, ${kind}`),
};
