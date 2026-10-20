'use client';

import { useRef } from 'react';
import { useLabels } from '../../i18n/use-labels';
import type { BlockRenderer } from '../../view';
import { NODE_ENTRY } from '../../view/navigation/node-entry';
import { useReadOnly } from '../../view/react/use-read-only';
import { hasPicture } from './image-source';
import { ImageFigure } from './ImageFigure';
import { ImageUploadArea } from './ImageUploadArea';
import { useImageKeys } from './use-image-keys';

export const ImageBlock: BlockRenderer = ({ block, controller }) => {
  const labels = useLabels();
  const readOnly = useReadOnly(controller);
  const root = useRef<HTMLDivElement>(null);
  const picture = hasPicture(block.attrs);
  useImageKeys(controller, block.id, picture, !readOnly, root);

  const empty = readOnly ? (
    <p className="quoin-block-message">{labels.emptyImage}</p>
  ) : (
    <ImageUploadArea blockId={block.id} controller={controller} />
  );
  return (
    <div
      ref={root}
      role="group"
      aria-label={labels.blockNames.image}
      contentEditable={false}
      className="quoin-image"
      {...(picture ? { [NODE_ENTRY]: '' } : undefined)}
    >
      {picture ? <ImageFigure block={block} controller={controller} readOnly={readOnly} /> : empty}
    </div>
  );
};
