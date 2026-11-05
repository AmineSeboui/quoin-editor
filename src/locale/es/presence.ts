import type { PresenceLabels } from '../../extensions/presence/presence-labels';
import { list } from './format';

/** Every string the presence feature speaks, in Spanish. */
export const esPresenceLabels: PresenceLabels = {
  joined: (names) => `${list(names)} ${names.length === 1 ? 'se ha unido' : 'se han unido'} al documento`,
  left: (names) => `${list(names)} ${names.length === 1 ? 'ha salido' : 'han salido'} del documento`,
  here: (names) => `${list(names)} ${names.length === 1 ? 'está' : 'están'} aquí`,
  caret: (name) => name,
};
