'use client';

import type { CommentAuthor, ThreadComment } from './comment-threads';
import { AuthorName } from './AuthorName';
import { CommentAvatar } from './CommentAvatar';
import type { CommentsLabels } from './comments-labels';

/** One comment: who wrote it and when, and its body as plain text with its line breaks. */
type CommentItemProps = {
  comment: ThreadComment;
  labels: CommentsLabels;
  authorTag?(author: CommentAuthor): string | undefined;
};

export function CommentItem({ comment, labels, authorTag }: CommentItemProps) {
  return (
    <li className="flex gap-2">
      <CommentAvatar author={comment.author} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <AuthorName author={comment.author} tag={authorTag} />
          <time dateTime={comment.createdAt} className="text-xs text-muted-foreground">
            {labels.postedAt(comment.createdAt)}
          </time>
        </p>
        <p className="quoin-comments-body text-sm">{comment.body}</p>
      </div>
    </li>
  );
}
