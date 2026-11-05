import type { FindLabels } from '../../extensions/find/find-labels';
import { number } from './format';

/** Every string find and replace shows or speaks, in Arabic. */
export const arFindLabels: FindLabels = {
  findAndReplace: 'بحث واستبدال',
  find: 'بحث',
  replaceWith: 'استبدال بـ',
  matchCase: 'مطابقة حالة الأحرف',
  wholeWord: 'الكلمة بأكملها',
  regularExpression: 'تعبير نمطي',
  previousMatch: 'النتيجة السابقة',
  nextMatch: 'النتيجة التالية',
  replace: 'استبدال',
  replaceAll: 'استبدال الكل',
  close: 'إغلاق',
  noResults: 'لا نتائج',
  invalidPattern: 'تعبير نمطي غير صالح',
  matchCount: (current, total, more) => `${number(current)} من ${number(total)}${more ? '+' : ''}`,
};
