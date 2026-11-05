import type { MentionLabels } from '../../extensions/mention/mention-labels';

/** Every string the mention feature shows or speaks, in Portuguese. */
export const ptMentionLabels: MentionLabels = {
  mentionMenu: 'Menções',
  searching: 'Procurando…',
  noMatches: 'Nada encontrado',
  mentionDescription: (kind) => (kind === undefined ? 'Menção' : `Menção, ${kind}`),
};
