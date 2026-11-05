import type { FindLabels } from '../../extensions/find/find-labels';
import { number } from './format';

/** Every string find and replace shows or speaks, in Spanish. */
export const esFindLabels: FindLabels = {
  findAndReplace: 'Buscar y reemplazar',
  find: 'Buscar',
  replaceWith: 'Reemplazar por',
  matchCase: 'Distinguir mayúsculas y minúsculas',
  wholeWord: 'Palabra completa',
  regularExpression: 'Expresión regular',
  previousMatch: 'Resultado anterior',
  nextMatch: 'Resultado siguiente',
  replace: 'Reemplazar',
  replaceAll: 'Reemplazar todo',
  close: 'Cerrar',
  noResults: 'Sin resultados',
  invalidPattern: 'Expresión regular no válida',
  matchCount: (current, total, more) => `${number(current)} de ${number(total)}${more ? '+' : ''}`,
};
