import type { MentionLabels } from '../../extensions/mention/mention-labels';

/** Every string the mention feature shows or speaks, in Spanish. */
export const esMentionLabels: MentionLabels = {
  mentionMenu: 'Menciones',
  searching: 'Buscando…',
  noMatches: 'Sin coincidencias',
  mentionDescription: (kind) => (kind === undefined ? 'Mención' : `Mención, ${kind}`),
};
