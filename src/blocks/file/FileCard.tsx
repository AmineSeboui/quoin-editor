'use client';

import { useRef } from 'react';
import { Download } from 'lucide-react';
import { useQuoin } from '../../context';
import { optionalNumber } from '../../engine/blocks/data-fields';
import { bubblePart } from '../../menus/bubble/bubble-part';
import type { BlockRenderProps } from '../../view';
import { str } from '../../engine/blocks/data-fields';
import { assetHref } from '../upload/resolved-asset';
import { selectHandlers } from '../void/select-handlers';
import { fileIcon } from './file-icon';
import { fileName } from './file-source';

type FileCardProps = BlockRenderProps & { readOnly: boolean };

/**
 * A file as a card: an icon for its type, its name and size, and a link that downloads it, which an editable canvas
 * reaches from the toolbar of the block. Escape on the link, or a click elsewhere on the card, selects the block.
 */
export function FileCard({ block, controller, readOnly }: FileCardProps) {
  const { labels, resolveAssetUrl } = useQuoin();
  const card = useRef<HTMLDivElement>(null);
  const { id, attrs } = block;
  const name = fileName(attrs);
  const size = optionalNumber(attrs.size);
  const href = assetHref(resolveAssetUrl, str(attrs.storageKey));
  const Icon = fileIcon(str(attrs.mime), name);

  return (
    <div ref={card} className="quoin-file-card" {...selectHandlers(controller, id, card)}>
      <Icon aria-hidden="true" className="quoin-file-icon" />
      <span className="quoin-file-name">{name}</span>
      {size !== undefined && <span className="quoin-file-size">{labels.fileSize(size)}</span>}
      {href !== null && (
        <a
          href={href}
          download={str(attrs.filename)}
          target="_blank"
          rel="noopener"
          aria-label={labels.downloadFile(name)}
          className="quoin-file-download"
          tabIndex={readOnly ? undefined : -1}
          {...(readOnly ? undefined : bubblePart(controller))}
        >
          <Download aria-hidden="true" />
          {labels.download}
        </a>
      )}
    </div>
  );
}
