'use client';

import { useState } from 'react';
import { webAddress } from '../web-address';
import type { CommentAuthor } from './comment-threads';

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0]?.toUpperCase() ?? '')
    .join('');

/** A person's picture, or their initials when they have none or it fails to load. Their name is written beside it. */
export function CommentAvatar({ author }: { author: CommentAuthor }) {
  const picture = webAddress(author.avatarUrl);
  const [failed, setFailed] = useState<string | null>(null);
  if (picture !== null && picture !== failed) {
    return (
      <img
        src={picture}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        draggable={false}
        className="size-6 shrink-0 rounded-full object-cover"
        onError={() => setFailed(picture)}
      />
    );
  }
  return (
    <span aria-hidden="true" className="quoin-comments-initials">
      {initials(author.name)}
    </span>
  );
}
