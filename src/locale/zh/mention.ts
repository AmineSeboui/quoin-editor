import type { MentionLabels } from '../../extensions/mention/mention-labels';

/** Every string the mention feature shows or speaks, in Simplified Chinese. */
export const zhMentionLabels: MentionLabels = {
  mentionMenu: '提及',
  searching: '正在搜索…',
  noMatches: '没有匹配项',
  mentionDescription: (kind) => (kind === undefined ? '提及' : `提及，${kind}`),
};
