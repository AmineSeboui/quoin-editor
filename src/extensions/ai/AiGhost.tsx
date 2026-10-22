'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { acceptAnswer } from './ai-accept';
import type { AiEnv } from './ai-env';
import { discard, followUp, retry, stop } from './ai-flow';
import type { AiGhost as Ghost } from './ai-plugin';
import { useGhostAnchor } from './use-ai-anchors';

const PRIMARY = 'data-ai-primary';

type AiGhostProps = { env: AiEnv; ghost: Ghost; gone: boolean; barId: string };

/**
 * The bar under an answer: Writing and Stop while it streams, then Accept, Discard, Retry and a field for a follow-up,
 * or the error and Retry. Focus that was in it stays in it as its buttons change; Escape stops the stream, then
 * discards the answer and gives focus back to the text.
 */
export function AiGhost({ env, ghost, gone, barId }: AiGhostProps) {
  const { controller, stream, labels } = env;
  const { editor } = controller;
  const anchor = useGhostAnchor(controller);
  const content = useRef<HTMLDivElement>(null);
  const inside = useRef(false);
  const [next, setNext] = useState('');
  const { phase } = ghost;

  const focusPrimary = () => content.current?.querySelector<HTMLElement>(`[${PRIMARY}]`)?.focus();
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
    <Popover open modal={false}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        ref={content}
        id={barId}
        role="group"
        aria-label={labels.response}
        side="bottom"
        align="start"
        updatePositionStrategy="always"
        className="flex w-auto max-w-md flex-wrap items-center gap-2 p-2"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const active = content.current?.ownerDocument.activeElement;
          inside.current = active === null || active === active?.ownerDocument.body;
          if (inside.current) focusPrimary();
        }}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onFocusCapture={() => (inside.current = true)}
        onBlurCapture={(event) => (inside.current = content.current?.contains(event.relatedTarget as Node) ?? false)}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          // An Escape pressed in the text brings focus here, the way to Accept and Discard from the keyboard.
          if (!content.current?.contains(event.target as Node)) focusPrimary();
          else if (phase === 'streaming') stop(editor);
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
      </PopoverContent>
    </Popover>
  );
}
