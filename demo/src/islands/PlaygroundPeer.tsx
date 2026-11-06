import { useState } from 'react';
import { BlockCanvas, type CodeHighlighter, type QuoinBlock } from 'quoin-editor';
import type { Extension } from 'quoin-editor/engine';
import { resolveAssetUrl } from '../site/asset-url';
import { PARTNER } from './playground-collaboration';
import { peerExtensions } from './playground-extensions';
import type { LabelSets } from './playground-languages';

type Props = { shared: Extension[]; sets: LabelSets | null; highlight: CodeHighlighter | undefined };

/** The second person on the same document, drawing from a Yjs document of its own that reconciles with the first. */
export function PlaygroundPeer({ shared, sets, highlight }: Props) {
  const [blocks, setBlocks] = useState<QuoinBlock[]>([]);
  const [extensions] = useState(() => peerExtensions(sets, shared));

  return (
    <section className="play-peer" aria-labelledby="play-peer-heading">
      <h2 id="play-peer-heading">{PARTNER.name}, on the same document</h2>
      <BlockCanvas
        blocks={blocks}
        onChange={setBlocks}
        extensions={extensions}
        labels={sets?.core}
        highlight={highlight}
        resolveAssetUrl={resolveAssetUrl}
        aria-label={`${PARTNER.name}’s copy`}
        className="editor-frame"
      />
    </section>
  );
}
