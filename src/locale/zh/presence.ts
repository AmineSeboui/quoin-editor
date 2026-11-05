import type { PresenceLabels } from '../../extensions/presence/presence-labels';
import { list } from './format';

/** Every string the presence feature speaks, in Simplified Chinese. */
export const zhPresenceLabels: PresenceLabels = {
  joined: (names) => `${list(names)}加入了文档`,
  left: (names) => `${list(names)}离开了文档`,
  here: (names) => `${list(names)}正在这里`,
  caret: (name) => name,
};
