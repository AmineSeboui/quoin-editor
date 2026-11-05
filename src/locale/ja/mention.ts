import type { MentionLabels } from '../../extensions/mention/mention-labels';

/** Every string the mention feature shows or speaks, in Japanese. */
export const jaMentionLabels: MentionLabels = {
  mentionMenu: 'メンション',
  searching: '検索中…',
  noMatches: '一致するものがありません',
  mentionDescription: (kind) => (kind === undefined ? 'メンション' : `メンション、${kind}`),
};
