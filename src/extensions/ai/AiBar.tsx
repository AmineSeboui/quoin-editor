'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { acceptAnswer } from './ai-accept';
import type { AiEnv } from './ai-env';
import { discard, followUp, retry, stop } from './ai-flow';
import type { AiGhost } from './ai-plugin';

/** The control of the bar that takes focus: Stop, Accept or Retry. */
export const PRIMARY = 'data-ai-primary';

type AiBarProps = { env: AiEnv; ghost: AiGhost; gone: boolean; barId: string };

/**
 * The bar under an answer: Writing and Stop while it streams, then Accept, Discard, Retry and a field for a follow-up,
 * or the error and Retry. Focus that was in it stays in it as its buttons change; Escape stops the stream, then
 * discards the answer and gives focus back to the text.
 */
export function AiBar({ env, ghost, gone, barId }: AiBarProps) {
  const { controller, stream, labels } = env;
  const { editor } = controller;
  const content = useRef<HTMLDivElement>(null);
  const inside = useRef(false);
  const [next, setNext] = useState('');
  const { phase } = ghost;

  const focusPrimary = () => content.current?.querySelector<HTMLElement>(`[${PRIMARY}]`)?.focus();
  // Opened from the menu, whose field is gone, focus has fallen to the body: it comes here, never from anywhere else.
  useIsomorphicLayoutEffect(() => {
    const active = content.current?.ownerDocument.activeElement;
    inside.current = active == null || active === active.ownerDocument.body;
    if (inside.current) focusPrimary();
  }, []);
  useIsomorphicLayoutEffect(() => {
    const active = content.current?.ownerDocument.activeElement;
    if (inside.current && !content.current?.contains(active ?? null)) focusPrimary();
  }, [phase, ghost.key]);

  const backToText = () => {
    if (inside.current) controller.focus();
    inside.current = false;
  };
  const onAccept = () => {
    let gone = false;
    controller.edit(() => {
      const result = acceptAnswer(editor);
      gone = result?.gone ?? false;
      return result !== null;
    });
    controller.focus();
    if (gone) controller.announce(labels.targetGone);
  };
  const onDiscard = () => {
    discard(editor);
    backToText();
  };
  const onFollowUp = (event: FormEvent) => {
    event.preventDefault();
    if (next.trim() === '') return;
    followUp(editor, stream, next.trim());
    setNext('');
  };
  const primary = { [PRIMARY]: '' };

  return (
    <div
      ref={content}
      id={barId}
      role="group"
      aria-label={labels.response}
      className="quoin-ai-bar flex flex-wrap items-center gap-2 rounded-md border bg-popover p-2 text-popover-foreground shadow-md"
      onFocus={() => (inside.current = true)}
      onBlur={(event) => (inside.current = content.current?.contains(event.relatedTarget as Node) ?? false)}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || event.nativeEvent.isComposing) return;
        event.preventDefault();
        if (phase === 'streaming') stop(editor);
        else onDiscard();
      }}
    >
      {phase === 'streaming' && (
        <>
          <span className="text-sm text-muted-foreground">{labels.writing}</span>
          <Button {...primary} size="sm" variant="outline" onClick={() => stop(editor)}>
            {labels.stop}
          </Button>
        </>
      )}
      {phase === 'error' && (
        <>
          <p role="alert" className="text-sm text-destructive">
            {labels.failed}
          </p>
          <Button {...primary} size="sm" onClick={() => retry(editor, stream)}>
            {labels.retry}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDiscard}>
            {labels.discard}
          </Button>
        </>
      )}
      {(phase === 'done' || phase === 'stopped') && (
        <>
          {phase === 'stopped' && <span className="text-sm text-muted-foreground">{labels.stopped}</span>}
          {gone && <p className="w-full text-xs text-muted-foreground">{labels.targetGone}</p>}
          <Button {...primary} size="sm" onClick={onAccept}>
            {labels.accept}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDiscard}>
            {labels.discard}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => retry(editor, stream)}>
            {labels.retry}
          </Button>
          <form className="w-full" onSubmit={onFollowUp}>
            <Input
              aria-label={labels.followUp}
              placeholder={labels.followUp}
              value={next}
              onChange={(event) => setNext(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault();
              }}
            />
          </form>
        </>
      )}
    </div>
  );
}
