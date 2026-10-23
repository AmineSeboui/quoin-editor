'use client';

import { SendHorizontal } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '../../ui/button';
import { sendReply } from './comment-actions';
import { CommentAvatar } from './CommentAvatar';
import type { CommentsEnv } from './comments-env';

export const REPLY_FIELD = 'data-comments-field';

type ReplyBoxProps = { env: CommentsEnv; threadId: string; first: boolean };

/** The field for the next comment of a thread: Mod+Enter or Send sends it, and it empties once the host has it. */
export function ReplyBox({ env, threadId, first }: ReplyBoxProps) {
  const { controller, host, labels, link } = env;
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const label = first ? labels.addComment : labels.reply;
  const text = body.trim();

  const send = async () => {
    if (text === '' || sending) return;
    setSending(true);
    const sent = await sendReply(link, host.onReply, threadId, text);
    if (!alive.current) return;
    setSending(false);
    if (sent) setBody('');
  };
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || event.key !== 'Enter') return;
    if (controller.isMac ? !event.metaKey : !event.ctrlKey) return;
    event.preventDefault();
    void send();
  };

  return (
    <form className="flex items-start gap-2" onSubmit={onSubmit}>
      <CommentAvatar author={host.currentUser} />
      <textarea
        {...{ [REPLY_FIELD]: '' }}
        aria-label={label}
        placeholder={label}
        rows={2}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={onKeyDown}
        className="quoin-comments-field"
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        aria-label={labels.send}
        aria-disabled={text === '' || sending || undefined}
      >
        <SendHorizontal />
      </Button>
    </form>
  );
}
