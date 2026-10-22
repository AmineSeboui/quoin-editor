'use client';

// The whole main entry, for the reason src/table.ts gives.
import './index';

export { commentsExtension, type CommentsOptions } from './extensions/comments/comments-extension';
export { englishCommentsLabels, type CommentsLabels } from './extensions/comments/comments-labels';
export {
  createCommentThreads,
  type CommentAuthor,
  type CommentThread,
  type CommentThreads,
  type CommentUser,
  type ThreadComment,
} from './extensions/comments/comment-threads';
