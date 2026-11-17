'use client';

import type { CommentAuthor } from './comment-threads';

/** An author's name, and the tag the host gives it, which is read with the name as one label. */
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
    <span role="group" aria-label={`${author.name}, ${label}`} className="inline-flex items-baseline gap-1">
      <span className="font-medium">{author.name}</span>
      <span className="quoin-comments-author-tag">{label}</span>
    </span>
  );
}
