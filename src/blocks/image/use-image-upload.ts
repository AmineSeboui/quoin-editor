'use client';

import { useCallback, useState, type RefObject } from 'react';
import { useQuoin } from '../../context';
import type { ViewController } from '../../view';
import { selectNode } from '../void/select-node';
import { uploadImage } from './image-upload';

type UploadState = { busy: boolean; error: string };

const IDLE: UploadState = { busy: false, error: '' };

/**
 * Uploads a picture into an empty image block, with the progress and the failure the block shows while it waits. Focus
 * still in the block when the picture lands, which takes the controls it was on away, goes to the image.
 */
export function useImageUpload(controller: ViewController, blockId: string, area: RefObject<HTMLElement | null>) {
  const { upload, resolveAssetUrl, labels } = useQuoin();
  const [state, setState] = useState(IDLE);
  const start = useCallback(
    (file: File) => {
      if (!upload) return;
      setState({ busy: true, error: '' });
      const onLand = () => {
        if (!area.current?.contains(area.current.ownerDocument.activeElement)) return;
        selectNode(controller, blockId);
        controller.focus();
      };
      uploadImage(controller, blockId, file, { upload, resolveAssetUrl, onLand }).then(
        () => setState(IDLE),
        (cause: unknown) => setState({ busy: false, error: (cause instanceof Error && cause.message) || labels.uploadFailed }),
      );
    },
    [controller, blockId, area, upload, resolveAssetUrl, labels],
  );
  return { ...state, start };
}
