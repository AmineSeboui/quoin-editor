'use client';

import * as React from 'react';
import { useQuoin } from '../context';
import { useLabels } from '../i18n/use-labels';
import type { QuoinLabels } from '../i18n/labels';
import { toError } from '../to-error';
import type { UploadResult } from '../types';
import { FilePickerButton } from './FilePickerButton';
import { uploadError } from './upload-error';

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

/**
 * A file picker wired to the canvas `upload` function, with its own busy state, success message and inline error. The
 * progress is announced through the live region of the canvas it is drawn in, or a live region of its own outside one.
 */
export function UploadField({ category, label, accept, onUploaded }: UploadFieldProps) {
  const { upload, onError, controller } = useQuoin();
  const labels = useLabels();
  const [state, setState] = React.useState<UploadState>({ phase: 'idle' });

  async function run(file: File) {
    if (!upload) return;
    setState({ phase: 'busy' });
    controller?.announce(labels.uploading);
    let result: UploadResult;
    try {
      result = await upload(file, category);
    } catch (cause) {
      setState({ phase: 'failed', message: uploadError(cause, labels.uploadFailed).message });
      return;
    }
    try {
      await onUploaded(result);
      const name = result.filename || file.name;
      setState({ phase: 'uploaded', name });
      controller?.announce(labels.uploaded(name));
    } catch (cause) {
      onError(toError(cause));
      setState({ phase: 'idle' });
    }
  }

  const progress = progressText(state, labels);

  return (
    <div className="flex flex-col items-start gap-1.5">
      <FilePickerButton
        label={label}
        accept={accept}
        disabled={!upload}
        busy={state.phase === 'busy'}
        onPick={(file) => void run(file)}
      />
      {!upload && (
        <span role="note" className="text-xs text-muted-foreground">
          {labels.uploadsUnavailable}
        </span>
      )}
      {/* Inside a canvas its live region speaks the progress. Outside one, this is rendered always, so a screen reader
          is already watching it when its first message arrives. */}
      <span role={controller ? undefined : 'status'} className={progress === '' ? 'sr-only' : 'text-xs text-muted-foreground'}>
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
