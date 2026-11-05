import type { FindLabels } from '../../extensions/find/find-labels';
import { number } from './format';

/** Every string find and replace shows or speaks, in German. */
export const deFindLabels: FindLabels = {
  findAndReplace: 'Suchen und ersetzen',
  find: 'Suchen',
  replaceWith: 'Ersetzen durch',
  matchCase: 'Groß- und Kleinschreibung beachten',
  wholeWord: 'Nur ganzes Wort',
  regularExpression: 'Regulärer Ausdruck',
  previousMatch: 'Vorheriger Treffer',
  nextMatch: 'Nächster Treffer',
  replace: 'Ersetzen',
  replaceAll: 'Alle ersetzen',
  close: 'Schließen',
  noResults: 'Keine Ergebnisse',
  invalidPattern: 'Ungültiger regulärer Ausdruck',
  matchCount: (current, total, more) => `${number(current)} von ${number(total)}${more ? '+' : ''}`,
};
