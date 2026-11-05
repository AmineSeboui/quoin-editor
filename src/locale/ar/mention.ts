import type { MentionLabels } from '../../extensions/mention/mention-labels';

/** Every string the mention feature shows or speaks, in Arabic. */
export const arMentionLabels: MentionLabels = {
  mentionMenu: 'الإشارات',
  searching: 'جارٍ البحث…',
  noMatches: 'لا نتائج مطابقة',
  mentionDescription: (kind) => (kind === undefined ? 'إشارة' : `إشارة، ${kind}`),
};
