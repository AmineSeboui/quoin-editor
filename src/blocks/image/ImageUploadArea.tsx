'use client';

import { useState } from 'react';
import { Link } from 'lucide-react';
import { useLabels } from '../../i18n/use-labels';
import { Button } from '../../ui/button';
import type { ViewController } from '../../view';
import { UploadArea } from '../upload/UploadArea';
import { EmbedLinkForm } from './EmbedLinkForm';
import { isImageFile, uploadImage } from './image-upload';

/** What an image block with no picture shows: an upload button, a link to embed, and room to drop or paste an image. */
export function ImageUploadArea({ blockId, controller }: { blockId: string; controller: ViewController }) {
  const labels = useLabels();
  const [linking, setLinking] = useState(false);
  return (
    <UploadArea
      blockId={blockId}
      controller={controller}
      uploader={uploadImage}
      takes={isImageFile}
      accept="image/*"
      label={labels.uploadImage}
      hint={labels.dropImage}
      className="quoin-image-upload"
      onSelect={() => setLinking(false)}
      actions={
        <Button type="button" variant="ghost" size="sm" aria-expanded={linking} onClick={() => setLinking(true)}>
          <Link />
          {labels.embedLink}
        </Button>
      }
    >
      {linking && <EmbedLinkForm blockId={blockId} controller={controller} />}
    </UploadArea>
  );
}
