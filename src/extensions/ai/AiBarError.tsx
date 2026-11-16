'use client';

import { CircleAlert, RotateCcw, X } from '../../icons';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
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
      <Alert variant="destructive" className="min-w-0 flex-1 border-0 bg-transparent px-1.5 py-0">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>{labels.failed}</AlertTitle>
        {failure?.reason !== undefined && (
          <AlertDescription className="text-xs text-muted-foreground">{failure.reason}</AlertDescription>
        )}
      </Alert>
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
