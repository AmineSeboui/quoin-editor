'use client';

import { useRef } from 'react';
import { useQuoin } from '../../context';
import { Check, RotateCcw, Square, X } from '../../icons';
import { formatShortcut } from '../../shortcuts/format-shortcut';
import { Button } from '../../ui/button';
import { IconButton } from '../../ui/icon-button';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { acceptAnswer } from './ai-accept';
import type { AiEnv } from './ai-env';
import { discard, followUp, retry, stop } from './ai-flow';
import type { AiGhost } from './ai-plugin';
import { AiBarError } from './AiBarError';
import { AiFollowUp } from './AiFollowUp';

/** The control of the bar that takes focus: Stop, Accept, Retry, or Discard when there is no Retry. */
export const PRIMARY = 'data-ai-primary';

type AiBarProps = { env: AiEnv; ghost: AiGhost; gone: boolean; barId: string };

/**
 * The bar under an answer: Writing and Stop while it streams, then Accept, Discard, Retry and a field for a follow-up,
 * or the error, with the reason the host gives, and Retry unless the host says asking again cannot help. Focus that was in it stays in it as its buttons change; Escape stops the stream, then
 * discards the answer and gives focus back to the text.
 */
export function AiBar({ env, ghost, gone, barId }: AiBarProps) {
  const { controller, stream, labels } = env;
  const { editor } = controller;
  const content = useRef<HTMLDivElement>(null);
  const inside = useRef(false);
  const { phase, failure } = ghost;
  const keyLabels = useQuoin().labels;
  const discardKey = formatShortcut('Escape', { isMac: controller.isMac, labels: keyLabels });

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
  const primary = { [PRIMARY]: '' };

  return (
    <div
      ref={content}
      id={barId}
      role="group"
      aria-label={labels.response}
      className="quoin-ai-bar flex flex-wrap items-center gap-1.5 rounded-lg bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10"
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
          <span className="quoin-shimmer px-1.5 text-sm text-muted-foreground">{labels.writing}</span>
          <Button {...primary} size="sm" variant="outline" className="ms-auto" onClick={() => stop(editor)}>
            <Square />
            {labels.stop}
          </Button>
        </>
      )}
      {phase === 'error' && (
        <AiBarError
          labels={labels}
          failure={failure}
          discardKey={discardKey}
          primary={primary}
          onRetry={() => retry(editor, stream)}
          onDiscard={onDiscard}
        />
      )}
      {(phase === 'done' || phase === 'stopped') && (
        <>
          {phase === 'stopped' && <span className="px-1.5 text-sm text-muted-foreground">{labels.stopped}</span>}
          {gone && <p className="w-full px-1.5 text-xs text-muted-foreground">{labels.targetGone}</p>}
          <Button {...primary} size="sm" onClick={onAccept}>
            <Check />
            {labels.accept}
          </Button>
          <IconButton label={labels.discard} shortcut={discardKey} onClick={onDiscard}>
            <X />
          </IconButton>
          <IconButton label={labels.retry} onClick={() => retry(editor, stream)}>
            <RotateCcw />
          </IconButton>
          <AiFollowUp labels={labels} onSend={(request) => followUp(editor, stream, request)} />
        </>
      )}
    </div>
  );
}
