import type { FindLabels } from '../../extensions/find/find-labels';
import { number } from './format';

/** Every string find and replace shows or speaks, in Japanese. */
export const jaFindLabels: FindLabels = {
  findAndReplace: '検索と置換',
  find: '検索',
  replaceWith: '置換後の文字列',
  matchCase: '大文字と小文字を区別',
  wholeWord: '単語全体',
  regularExpression: '正規表現',
  previousMatch: '前の一致',
  nextMatch: '次の一致',
  replace: '置換',
  replaceAll: 'すべて置換',
  close: '閉じる',
  noResults: '結果がありません',
  invalidPattern: '正規表現が正しくありません',
  matchCount: (current, total, more) => `${number(total)} 件中 ${number(current)} 件目${more ? '+' : ''}`,
};
