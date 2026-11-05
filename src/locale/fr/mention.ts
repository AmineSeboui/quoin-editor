import type { MentionLabels } from '../../extensions/mention/mention-labels';

/** Every string the mention feature shows or speaks, in French. */
export const frMentionLabels: MentionLabels = {
  mentionMenu: 'Mentions',
  searching: 'Recherche…',
  noMatches: 'Aucun résultat',
  mentionDescription: (kind) => (kind === undefined ? 'Mention' : `Mention, ${kind}`),
};
