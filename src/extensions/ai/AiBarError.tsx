'use client';

import { CircleAlert, RotateCcw, X } from '../../icons';
import { Button } from '../../ui/button';
import { IconButton } from '../../ui/icon-button';
import type { AiFailure } from './ai-failure';
import type { AiLabels } from './ai-labels';

type AiBarErrorProps = {
  labels: AiLabels;
  failure?: AiFailure;
  discardKey: string;
  primary: Record<string, string>;
  onRetry(): void;
  onDiscard(): void;
};

/** A failed answer: why, when the host says, then Retry unless asking again cannot help, and Discard. */
export function AiBarError({ labels, failure, discardKey, primary, onRetry, onDiscard }: AiBarErrorProps) {
  const retryable = failure?.retryable !== false;
  return (
    <>
      <div role="alert" className="flex min-w-0 flex-1 items-start gap-2 px-1.5 text-sm">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0">
          <p className="font-medium text-destructive">{labels.failed}</p>
          {failure?.reason !== undefined && <p className="text-xs text-muted-foreground">{failure.reason}</p>}
        </div>
      </div>
      {retryable && (
        <Button {...primary} size="sm" onClick={onRetry}>
          <RotateCcw />
          {labels.retry}
        </Button>
      )}
      <IconButton {...(retryable ? {} : primary)} label={labels.discard} shortcut={discardKey} onClick={onDiscard}>
        <X />
      </IconButton>
    </>
  );
}
