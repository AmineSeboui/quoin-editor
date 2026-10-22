'use client';

import type { ThreadComment } from './comment-threads';
import { CommentAvatar } from './CommentAvatar';
import type { CommentsLabels } from './comments-labels';

/** One comment: who wrote it and when, and its body as plain text with its line breaks. */
export function CommentItem({ comment, labels }: { comment: ThreadComment; labels: CommentsLabels }) {
  return (
    <li className="flex gap-2">
      <CommentAvatar author={comment.author} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-medium">{comment.author.name}</span>
          <time dateTime={comment.createdAt} className="text-xs text-muted-foreground">
            {labels.postedAt(comment.createdAt)}
          </time>
        </p>
        <p className="quoin-comments-body text-sm">{comment.body}</p>
      </div>
    </li>
  );
}
