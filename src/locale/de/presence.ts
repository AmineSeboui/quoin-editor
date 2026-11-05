import type { PresenceLabels } from '../../extensions/presence/presence-labels';
import { list } from './format';

/** Every string the presence feature speaks, in German. */
export const dePresenceLabels: PresenceLabels = {
  joined: (names) => `${list(names)} ${names.length === 1 ? 'ist' : 'sind'} dazugekommen`,
  left: (names) => `${list(names)} ${names.length === 1 ? 'hat' : 'haben'} das Dokument verlassen`,
  here: (names) => `${list(names)} ${names.length === 1 ? 'ist' : 'sind'} hier`,
  caret: (name) => name,
};
