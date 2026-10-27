'use client';

import { useMemo } from 'react';
import { str } from '../../engine/blocks/data-fields';
import { firstNamed } from '../../engine/render/first-named';
import type { BlockRenderProps } from '../../view';
import { useReadOnly } from '../../view/react/use-read-only';
import { EmbedFrame } from './EmbedFrame';
import type { EmbedFeature } from './embed-feature';
import { LinkCard } from './LinkCard';
import { matchEmbed } from './providers';
import { useLinkCardKeys } from './use-link-card-keys';

type EmbedBlockProps = BlockRenderProps & { feature: EmbedFeature };

/** An embed: the frame of the provider that frames its address, or else a card that links to the address. */
export function EmbedBlock({ block, controller, feature }: EmbedBlockProps) {
  const { labels, providers } = feature;
  const readOnly = useReadOnly(controller);
  const url = str(block.attrs.url);
  const match = useMemo(() => matchEmbed(url, providers), [url, providers]);
  const { root, link } = useLinkCardKeys(controller, block.id, url, !readOnly && match === null);

  return (
    <div ref={root} role="group" aria-label={labels.embed} contentEditable={false} className="quoin-embed">
      {match === null ? (
        <LinkCard controller={controller} blockId={block.id} url={url} readOnly={readOnly} linkRef={link} />
      ) : (
        <EmbedFrame
          blockId={block.id}
          controller={controller}
          match={match}
          title={firstNamed(labels.frameTitle(match.provider), match.provider, url)}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
