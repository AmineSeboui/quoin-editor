import type { PresenceLabels } from '../../extensions/presence/presence-labels';
import { list } from './format';

/** Every string the presence feature speaks, in Arabic. */
export const arPresenceLabels: PresenceLabels = {
  joined: (names) => `انضم ${list(names)} إلى المستند`,
  left: (names) => `غادر ${list(names)} المستند`,
  here: (names) => `${list(names)} هنا الآن`,
  caret: (name) => name,
};
