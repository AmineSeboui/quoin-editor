'use client';

import { useState } from 'react';
import { webAddress } from '../web-address';
import type { MentionResult } from './mention-feature';

/** A row of the mention menu: the result's avatar when it has a web address, its label and its description. */
export function MentionItem({ result }: { result: MentionResult }) {
  const avatar = webAddress(result.avatarUrl);
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <>
      {avatar !== null && avatar !== failed && (
        <img
          src={avatar}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          draggable={false}
          className="size-6 shrink-0 rounded-full object-cover"
          onError={() => setFailed(avatar)}
        />
      )}
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{result.label}</span>
        {result.description && <span className="truncate text-xs text-muted-foreground">{result.description}</span>}
      </span>
    </>
  );
}
