'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { Link } from 'lucide-react';
import { useQuoin } from '../../context';
import { Button } from '../../ui/button';
import { FilePickerButton } from '../../upload/FilePickerButton';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { isInteractive } from '../void/interactive-target';
import { selectNode } from '../void/select-node';
import { EmbedLinkForm } from './EmbedLinkForm';
import { useImageUpload } from './use-image-upload';

const imageIn = (transfer: DataTransfer | null): File | undefined =>
  Array.from(transfer?.files ?? []).find((file) => file.type.startsWith('image/'));

/** What an image block with no picture shows: an upload button, a link to embed, and room to drop or paste an image. */
export function ImageUploadArea({ blockId, controller }: { blockId: string; controller: ViewController }) {
  const { upload, labels } = useQuoin();
  const area = useRef<HTMLDivElement>(null);
  const [linking, setLinking] = useState(false);
  const { busy, error, start } = useImageUpload(controller, blockId, area);

  // The canvas hears a drop before React does, and would add a block of its own for the image.
  useEffect(() => {
    const element = area.current;
    const onDrop = (event: DragEvent) => {
      const file = imageIn(event.dataTransfer);
      if (file === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      start(file);
    };
    element?.addEventListener('drop', onDrop);
    return () => element?.removeEventListener('drop', onDrop);
  }, [start]);

  const select = () => {
    setLinking(false);
    selectNode(controller, blockId);
    controller.focus();
  };
  const onPaste = (event: ClipboardEvent) => {
    const file = imageIn(event.clipboardData);
    if (file === undefined) return;
    event.preventDefault();
    start(file);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || isComposingKey(controller, event.nativeEvent)) return;
    event.preventDefault();
    select();
  };
  const onClick = (event: MouseEvent) => {
    if (!isInteractive(area.current, event)) select();
  };

  return (
    <div ref={area} className="quoin-image-upload" onPaste={onPaste} onKeyDown={onKeyDown} onClick={onClick}>
      <div className="quoin-image-actions">
        <FilePickerButton label={labels.uploadImage} accept="image/*" disabled={!upload} busy={busy} onPick={start} />
        <Button type="button" variant="ghost" size="sm" aria-expanded={linking} onClick={() => setLinking(true)}>
          <Link />
          {labels.embedLink}
        </Button>
      </div>
      {linking && <EmbedLinkForm blockId={blockId} controller={controller} />}
      <p className="quoin-image-message">{upload ? labels.dropImage : labels.uploadsUnavailable}</p>
      <p role="status" className={busy ? 'quoin-image-message' : 'sr-only'}>
        {busy ? labels.uploading : ''}
      </p>
      {error !== '' && (
        <p role="alert" className="quoin-image-message text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
