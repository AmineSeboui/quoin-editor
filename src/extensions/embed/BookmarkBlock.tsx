'use client';

import { str } from '../../blocks/str';
import type { BlockRenderProps } from '../../view';
import { useReadOnly } from '../../view/react/use-read-only';
import type { EmbedFeature } from './embed-feature';
import { LinkCard } from './LinkCard';
import { useLinkCardKeys } from './use-link-card-keys';
import { useUnfurl } from './use-unfurl';

type BookmarkBlockProps = BlockRenderProps & { feature: EmbedFeature };

/** A bookmark: a card for its page, filled in once by the host's unfurl when it has no title yet. */
export function BookmarkBlock({ block, controller, feature }: BookmarkBlockProps) {
  const readOnly = useReadOnly(controller);
  const { attrs } = block;
  const url = str(attrs.url);
  const title = str(attrs.title);
  const { root, link } = useLinkCardKeys(controller, block.id, url, !readOnly);
  useUnfurl(controller, block.id, url, title === '' && !readOnly ? feature.unfurl : undefined);

  return (
    <div
      ref={root}
      role="group"
      aria-label={feature.labels.bookmark}
      contentEditable={false}
      className="quoin-bookmark"
    >
      <LinkCard
        controller={controller}
        blockId={block.id}
        url={url}
        title={title}
        description={str(attrs.description)}
        image={str(attrs.image)}
        readOnly={readOnly}
        linkRef={link}
      />
    </div>
  );
}
