'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
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
  return (
    <Avatar size="sm">
      {picture !== null && picture !== failed ? (
        <AvatarImage
          src={picture}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setFailed(picture)}
        />
      ) : (
        <AvatarFallback aria-hidden="true">{initials(author.name)}</AvatarFallback>
      )}
    </Avatar>
  );
}
