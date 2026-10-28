'use client';

import { useRef, useState } from 'react';
import { Image } from 'lucide-react';
import { useQuoin } from '../../context';
import { englishLabels } from '../../i18n/english-labels';
import { optionalNumber } from '../../engine/blocks/data-fields';
import { EditableRegion, type BlockRenderProps } from '../../view';
import { str } from '../../engine/blocks/data-fields';
import { focusNode } from '../void/select-node';
import { requestAlt } from './alt-request';
import { imageSource } from './image-source';
import { ResizeHandles } from './ResizeHandles';

type ImageFigureProps = BlockRenderProps & { readOnly: boolean };

/**
 * The picture of an image block at the width the block keeps, with its width handles, then its caption. A picture
 * that cannot be loaded is drawn as missing, with its alt text.
 */
export function ImageFigure({ block, controller, readOnly }: ImageFigureProps) {
  const { labels, resolveAssetUrl } = useQuoin();
  const frame = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const { id, attrs, regions } = block;
  const src = imageSource(attrs, resolveAssetUrl);
  const alt = str(attrs.alt);
  const name = alt || labels.imageNoAlt;
  const percent = optionalNumber(attrs.widthPercent);
  const width = preview ?? percent;
  const flagged = !readOnly && alt === '' && attrs.decorative !== true;
  const select = () => focusNode(controller, id);

  return (
    <>
      <div ref={frame} className="quoin-image-frame" style={width === undefined ? undefined : { width: `${width}%` }}>
        {src !== null && src !== failed ? (
          <img
            src={src}
            alt={name}
            width={optionalNumber(attrs.width)}
            height={optionalNumber(attrs.height)}
            draggable={false}
            onError={() => setFailed(src)}
            onClick={select}
          />
        ) : (
          <div role="img" aria-label={name} className="quoin-image-missing" onClick={select}>
            <Image aria-hidden="true" />
            {alt}
          </div>
        )}
        {flagged && (
          <button
            type="button"
            className="quoin-image-no-alt"
            onClick={() => {
              select();
              requestAlt(controller, id);
            }}
          >
            {labels.noAltBadge ?? englishLabels.noAltBadge}
          </button>
        )}
        {!readOnly && (
          <ResizeHandles
            blockId={id}
            controller={controller}
            frame={frame}
            percent={percent}
            centred={attrs.align === 'center'}
            onPreview={setPreview}
          />
        )}
      </div>
      {(!readOnly || (regions.caption?.length ?? 0) > 0) && (
        <EditableRegion
          block={id}
          region="caption"
          label={labels.imageCaption}
          placeholder={labels.addCaption}
          className="quoin-image-caption"
        />
      )}
    </>
  );
}
