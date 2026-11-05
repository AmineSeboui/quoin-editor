import type { CommentsLabels } from '../../extensions/comments/comments-labels';
import { dateAndTime, number, plural } from './format';

const counted = (count: number) =>
  plural(count, {
    zero: 'لا تعليقات',
    one: 'تعليق واحد',
    two: 'تعليقان',
    few: `${number(count)} تعليقات`,
    many: `${number(count)} تعليقًا`,
    other: `${number(count)} تعليق`,
  });

/** Every string the comments feature shows or speaks, in Arabic. */
export const arCommentsLabels: CommentsLabels = {
  comment: 'تعليق',
  comments: 'التعليقات',
  showComments: counted,
  thread: (anchorText) => `تعليق على «${anchorText}»`,
  threadsHere: 'تعليقات على هذا النص',
  textRemoved: 'حُذف النص',
  addComment: 'إضافة تعليق',
  reply: 'رد',
  send: 'إرسال',
  resolve: 'إغلاق النقاش',
  delete: 'حذف',
  close: 'إغلاق',
  commentCount: counted,
  postedAt: dateAndTime,
};
