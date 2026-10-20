'use client';

import { useEffect, useRef, type ClipboardEvent, type ReactNode } from 'react';
import { useQuoin } from '../../context';
import { cn } from '../../ui/cn';
import { FilePickerButton } from '../../upload/FilePickerButton';
import type { ViewController } from '../../view';
import { selectHandlers } from '../void/select-handlers';
import type { BlockUploader } from './block-upload';
import { useBlockUpload } from './use-block-upload';

const fileIn = (transfer: DataTransfer | null, takes: (file: File) => boolean): File | undefined =>
  Array.from(transfer?.files ?? []).find(takes);

type UploadAreaProps = {
  blockId: string;
  controller: ViewController;
  uploader: BlockUploader;
  /** Whether the block takes a file dropped or pasted on it, rather than leaving it to the canvas. */
  takes(file: File): boolean;
  accept?: string;
  /** The name of the upload button, and what the area says can be dropped or pasted on it. */
  label: string;
  hint: string;
  className?: string;
  /** Called as Escape or a press around the controls selects the block. */
  onSelect?(): void;
  /** More controls beside the upload button, and what they open under them. */
  actions?: ReactNode;
  children?: ReactNode;
};

/** What a block with nothing uploaded yet shows: an upload button, and room to drop or paste a file. */
export function UploadArea(props: UploadAreaProps) {
  const { blockId, controller, uploader, takes, accept, label, hint, className, onSelect, actions, children } = props;
  const { upload, labels } = useQuoin();
  const area = useRef<HTMLDivElement>(null);
  const { busy, error, start } = useBlockUpload(controller, blockId, area, uploader);

  // The canvas hears a drop before React does, and would add a block of its own for the file.
  useEffect(() => {
    const element = area.current;
    const onDrop = (event: DragEvent) => {
      const file = fileIn(event.dataTransfer, takes);
      if (file === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      start(file);
    };
    element?.addEventListener('drop', onDrop);
    return () => element?.removeEventListener('drop', onDrop);
  }, [start, takes]);

  const onPaste = (event: ClipboardEvent) => {
    const file = fileIn(event.clipboardData, takes);
    if (file === undefined) return;
    event.preventDefault();
    start(file);
  };

  return (
    <div
      ref={area}
      className={cn('quoin-upload', className)}
      onPaste={onPaste}
      {...selectHandlers(controller, blockId, area, onSelect)}
    >
      <div className="quoin-upload-actions">
        <FilePickerButton label={label} accept={accept} disabled={!upload} busy={busy} onPick={start} />
        {actions}
      </div>
      {children}
      <p className="quoin-block-message">{upload ? hint : labels.uploadsUnavailable}</p>
      <p role="status" className={busy ? 'quoin-block-message' : 'sr-only'}>
        {busy ? labels.uploading : ''}
      </p>
      {error !== '' && (
        <p role="alert" className="quoin-block-message text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
