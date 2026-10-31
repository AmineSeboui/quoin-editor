import type { ReactNode } from 'react';
import type { QuoinBlock } from 'quoin-editor/engine';
import { QuoinView } from 'quoin-editor/view';
import type { IslandName } from '../islands/registry';
import { resolveAssetUrl } from './asset-url';

type Props = { name: IslandName; blocks: readonly QuoinBlock[]; fallback?: ReactNode };

/**
 * Where a live editor mounts in the browser. Until it does, and without JavaScript, the page shows the same document
 * drawn by `QuoinView`, so its text is in the HTML.
 */
export function Island({ name, blocks, fallback }: Props) {
  return (
    <div className="island" data-island={name}>
      {fallback ?? <QuoinView blocks={blocks} resolveAssetUrl={resolveAssetUrl} className="prose island-fallback" />}
    </div>
  );
}
