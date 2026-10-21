'use client';

import { useCallback, useRef, useState, type RefObject } from 'react';
import { useQuoin } from '../../context';
import type { ViewController } from '../../view';
import { focusNode } from '../void/select-node';
import type { BlockUploader } from './block-upload';

type UploadState = { busy: boolean; error: string };

const IDLE: UploadState = { busy: false, error: '' };

/**
 * Uploads a file into a block with nothing uploaded yet, with the progress and the failure of the newest upload, which
 * the block shows while it waits. Focus still in the block when the file lands, which takes the controls it was on
 * away, goes to the block. With no upload function, a file dropped or pasted on the block is reported to `onError`.
 */
export function useBlockUpload(
  controller: ViewController,
  blockId: string,
  area: RefObject<HTMLElement | null>,
  uploader: BlockUploader,
) {
  const { upload, resolveAssetUrl, onError, labels } = useQuoin();
  const [state, setState] = useState(IDLE);
  const started = useRef(0);
  const start = useCallback(
    (file: File) => {
      if (!upload) return onError(new Error(labels.uploadsUnavailable));
      const run = ++started.current;
      const settle = (next: UploadState) => {
        if (started.current === run) setState(next);
      };
      setState({ busy: true, error: '' });
      const onLand = () => {
        if (area.current?.contains(area.current.ownerDocument.activeElement)) focusNode(controller, blockId);
      };
      uploader(controller, blockId, file, { upload, resolveAssetUrl, onLand }).then(
        () => settle(IDLE),
        (cause: unknown) => settle({ busy: false, error: (cause instanceof Error && cause.message) || labels.uploadFailed }),
      );
    },
    [controller, blockId, area, uploader, upload, resolveAssetUrl, onError, labels],
  );
  return { ...state, start };
}
