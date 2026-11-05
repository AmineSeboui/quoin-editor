import type { FindLabels } from '../../extensions/find/find-labels';
import { number } from './format';

/** Every string find and replace shows or speaks, in French. */
export const frFindLabels: FindLabels = {
  findAndReplace: 'Rechercher et remplacer',
  find: 'Rechercher',
  replaceWith: 'Remplacer par',
  matchCase: 'Respecter la casse',
  wholeWord: 'Mot entier',
  regularExpression: 'Expression régulière',
  previousMatch: 'Résultat précédent',
  nextMatch: 'Résultat suivant',
  replace: 'Remplacer',
  replaceAll: 'Tout remplacer',
  close: 'Fermer',
  noResults: 'Aucun résultat',
  invalidPattern: 'Expression régulière non valide',
  matchCount: (current, total, more) => `${number(current)} sur ${number(total)}${more ? '+' : ''}`,
};
