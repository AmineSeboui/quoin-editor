import type { PresenceLabels } from '../../extensions/presence/presence-labels';
import { list } from './format';

/** Every string the presence feature speaks, in Japanese. */
export const jaPresenceLabels: PresenceLabels = {
  joined: (names) => `${list(names)} が参加しました`,
  left: (names) => `${list(names)} が退出しました`,
  here: (names) => `${list(names)} がここにいます`,
  caret: (name) => name,
};
