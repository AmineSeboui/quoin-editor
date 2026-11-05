import type { PresenceLabels } from '../../extensions/presence/presence-labels';
import { list } from './format';

/** Every string the presence feature speaks, in Portuguese. */
export const ptPresenceLabels: PresenceLabels = {
  joined: (names) => `${list(names)} ${names.length === 1 ? 'entrou' : 'entraram'} no documento`,
  left: (names) => `${list(names)} ${names.length === 1 ? 'saiu' : 'saíram'} do documento`,
  here: (names) => `${list(names)} ${names.length === 1 ? 'está' : 'estão'} aqui`,
  caret: (name) => name,
};
