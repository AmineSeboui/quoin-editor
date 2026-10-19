'use client';

import * as React from 'react';
import { useQuoin } from '../context';
import { useLabels } from '../i18n/use-labels';
import type { QuoinLabels } from '../i18n/labels';
import type { UploadResult } from '../types';
import { FilePickerButton } from './FilePickerButton';

/** Props for `UploadField`; the upload function itself comes from the canvas, not from here. */
export type UploadFieldProps = {
  /** Names what the file is for, and is passed to the host's `upload` as its second argument. */
  category: string;
  /** Labels the control for both the pointer and assistive technology. */
  label: string;
  /** An `accept` attribute for the file input, such as `'image/*'` or `'.pdf'`. */
  accept?: string;
  /** Called once the upload resolves. The field stays busy until a returned promise settles, and throwing or rejecting is reported through the canvas `onError`. */
  onUploaded: (result: UploadResult) => void | Promise<void>;
};

type UploadState =
  | { phase: 'idle' }
  | { phase: 'busy' }
  | { phase: 'uploaded'; name: string }
  | { phase: 'failed'; message: string };

function progressText(state: UploadState, labels: QuoinLabels): string {
  if (state.phase === 'busy') return labels.uploading;
  if (state.phase === 'uploaded') return labels.uploaded(state.name);
  return '';
}

/** A file picker wired to the canvas `upload` function, with its own busy state, success message and inline error. */
export function UploadField({ category, label, accept, onUploaded }: UploadFieldProps) {
  const { upload, onError } = useQuoin();
  const labels = useLabels();
  const [state, setState] = React.useState<UploadState>({ phase: 'idle' });

  async function run(file: File) {
    if (!upload) return;
    setState({ phase: 'busy' });
    let result: UploadResult;
    try {
      result = await upload(file, category);
    } catch (cause) {
      setState({ phase: 'failed', message: (cause instanceof Error && cause.message) || labels.uploadFailed });
      return;
    }
    try {
      await onUploaded(result);
      setState({ phase: 'uploaded', name: result.filename || file.name });
    } catch (cause) {
      onError(cause instanceof Error ? cause : new Error(String(cause)));
      setState({ phase: 'idle' });
    }
  }

  const progress = progressText(state, labels);

  return (
    <div className="flex flex-col items-start gap-1.5">
      <FilePickerButton
        label={label}
        accept={accept}
        disabled={state.phase === 'busy' || !upload}
        onPick={(file) => void run(file)}
      />
      {!upload && (
        <span role="note" className="text-xs text-muted-foreground">
          {labels.uploadsUnavailable}
        </span>
      )}
      {/* Always rendered, so a screen reader is already watching it when its first message arrives. */}
      <span role="status" className={progress === '' ? 'sr-only' : 'text-xs text-muted-foreground'}>
        {progress}
      </span>
      {state.phase === 'failed' && (
        <span role="alert" className="text-xs text-destructive">
          {state.message}
        </span>
      )}
    </div>
  );
}
