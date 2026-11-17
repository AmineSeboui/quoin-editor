'use client';

import type { CommentAuthor } from './comment-threads';

/** An author's name, and the tag the host gives it, read right after it. */
export function AuthorName({
  author,
  tag,
}: {
  author: CommentAuthor;
  tag?: (author: CommentAuthor) => string | undefined;
}) {
  const label = tag?.(author);
  if (!label) return <span className="font-medium">{author.name}</span>;
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-medium">{author.name}</span>
      <span className="sr-only">, </span>
      <span className="quoin-comments-author-tag">{label}</span>
    </span>
  );
}
