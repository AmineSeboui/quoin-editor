import type { CommentsLabels } from '../../extensions/comments/comments-labels';
import { dateAndTime, number } from './format';

const counted = (count: number) => `${number(count)} 件のコメント`;

/** Every string the comments feature shows or speaks, in Japanese. */
export const jaCommentsLabels: CommentsLabels = {
  comment: 'コメント',
  comments: 'コメント',
  showComments: counted,
  thread: (anchorText) => `「${anchorText}」へのコメント`,
  threadsHere: 'この文章へのコメント',
  textRemoved: '文章が削除されました',
  addComment: 'コメントを追加',
  reply: '返信',
  send: '送信',
  resolve: '解決済みにする',
  delete: '削除',
  close: '閉じる',
  commentCount: counted,
  postedAt: dateAndTime,
};
