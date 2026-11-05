import type { CommentsLabels } from '../../extensions/comments/comments-labels';
import { dateAndTime, number } from './format';

const counted = (count: number) => `${number(count)} 条评论`;

/** Every string the comments feature shows or speaks, in Simplified Chinese. */
export const zhCommentsLabels: CommentsLabels = {
  comment: '评论',
  comments: '评论',
  showComments: counted,
  thread: (anchorText) => `对“${anchorText}”的评论`,
  threadsHere: '对这段文字的评论',
  textRemoved: '文字已删除',
  addComment: '添加评论',
  reply: '回复',
  send: '发送',
  resolve: '标记为已解决',
  delete: '删除',
  close: '关闭',
  commentCount: counted,
  postedAt: dateAndTime,
};
