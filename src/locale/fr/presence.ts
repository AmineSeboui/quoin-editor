import type { PresenceLabels } from '../../extensions/presence/presence-labels';
import { list } from './format';

/** Every string the presence feature speaks, in French. */
export const frPresenceLabels: PresenceLabels = {
  joined: (names) => `${list(names)} ${names.length === 1 ? 'a rejoint le document' : 'ont rejoint le document'}`,
  left: (names) => `${list(names)} ${names.length === 1 ? 'a quitté le document' : 'ont quitté le document'}`,
  here: (names) => `${list(names)} ${names.length === 1 ? 'est là' : 'sont là'}`,
  caret: (name) => name,
};
