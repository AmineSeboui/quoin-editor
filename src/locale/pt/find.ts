import type { FindLabels } from '../../extensions/find/find-labels';
import { number } from './format';

/** Every string find and replace shows or speaks, in Portuguese. */
export const ptFindLabels: FindLabels = {
  findAndReplace: 'Localizar e substituir',
  find: 'Localizar',
  replaceWith: 'Substituir por',
  matchCase: 'Diferenciar maiúsculas de minúsculas',
  wholeWord: 'Palavra inteira',
  regularExpression: 'Expressão regular',
  previousMatch: 'Resultado anterior',
  nextMatch: 'Próximo resultado',
  replace: 'Substituir',
  replaceAll: 'Substituir tudo',
  close: 'Fechar',
  noResults: 'Nenhum resultado',
  invalidPattern: 'Expressão regular inválida',
  matchCount: (current, total, more) => `${number(current)} de ${number(total)}${more ? '+' : ''}`,
};
