'use client';

import { useRef, type ChangeEvent } from 'react';
import { useQuoin } from '../../context';
import type { ViewController } from '../../view';
import type { BlockUploader } from './block-upload';

/**
 * The hidden file input of a toolbar's replace button, which uploads the file picked into the block, says that it is
 * uploading, and reports a failure to `onError`, in the words of `uploadFailed` when it brings none of its own. There
 * is nothing to open while the canvas has no upload function.
 */
export function useReplacePicker(controller: ViewController, blockId: string, uploader: BlockUploader, accept?: string) {
  const { labels, upload, resolveAssetUrl, onError } = useQuoin();
  const picker = useRef<HTMLInputElement>(null);
  const replace = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined || !upload) return;
    controller.announce(labels.uploading);
    uploader(controller, blockId, file, { upload, resolveAssetUrl }).catch((cause: unknown) =>
      onError(cause instanceof Error && cause.message ? cause : new Error(labels.uploadFailed)),
    );
  };
  return {
    open: upload && (() => picker.current?.click()),
    input: <input ref={picker} type="file" accept={accept} hidden tabIndex={-1} onChange={replace} />,
  };
}
