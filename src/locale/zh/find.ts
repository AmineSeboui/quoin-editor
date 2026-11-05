import type { FindLabels } from '../../extensions/find/find-labels';
import { number } from './format';

/** Every string find and replace shows or speaks, in Simplified Chinese. */
export const zhFindLabels: FindLabels = {
  findAndReplace: '查找和替换',
  find: '查找',
  replaceWith: '替换为',
  matchCase: '区分大小写',
  wholeWord: '全字匹配',
  regularExpression: '正则表达式',
  previousMatch: '上一个结果',
  nextMatch: '下一个结果',
  replace: '替换',
  replaceAll: '全部替换',
  close: '关闭',
  noResults: '没有结果',
  invalidPattern: '正则表达式无效',
  matchCount: (current, total, more) => `第 ${number(current)} 个，共 ${number(total)} 个${more ? '+' : ''}`,
};
