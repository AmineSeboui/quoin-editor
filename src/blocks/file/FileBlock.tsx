'use client';

import { useRef } from 'react';
import { useLabels } from '../../i18n/use-labels';
import type { BlockRenderer } from '../../view';
import { useReadOnly } from '../../view/react/use-read-only';
import { UploadArea } from '../upload/UploadArea';
import { useNodeKeys } from '../void/use-node-keys';
import { FileCard } from './FileCard';
import { hasFile } from './file-source';
import { uploadFile } from './file-upload';

const anyFile = () => true;

/**
 * A file block: a card for the file it holds, or an upload button. Enter on the selected block focuses the button, or
 * goes on in a new line under the card, and a key typed on it never replaces it.
 */
export const FileBlock: BlockRenderer = ({ block, controller }) => {
  const labels = useLabels();
  const readOnly = useReadOnly(controller);
  const root = useRef<HTMLDivElement>(null);
  const filled = hasFile(block.attrs);
  useNodeKeys(controller, block.id, !readOnly, !filled, root);

  const empty = readOnly ? (
    <p className="quoin-block-message">{labels.emptyFile}</p>
  ) : (
    <UploadArea
      blockId={block.id}
      controller={controller}
      uploader={uploadFile}
      takes={anyFile}
      label={labels.uploadFile}
      hint={labels.dropFile}
    />
  );
  return (
    <div ref={root} role="group" aria-label={labels.blockNames.file} contentEditable={false} className="quoin-file">
      {filled ? <FileCard block={block} controller={controller} readOnly={readOnly} /> : empty}
    </div>
  );
};
