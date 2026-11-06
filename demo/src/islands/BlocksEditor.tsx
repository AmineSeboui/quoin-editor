import { useState } from 'react';
import { BlockCanvas, type QuoinBlock, type QuoinEditorHandle } from 'quoin-editor';
import { catalogue } from 'quoin-editor/catalogue';
import { usePrismHighlighter } from 'quoin-editor/highlight';
import { QuoinSource } from 'quoin-editor/source';
import { everyBlock } from '../content/every-block';
import { searchPeople } from '../content/people';
import { resolveAssetUrl } from '../site/asset-url';
import { renderDiagram } from '../site/diagram';

export default function BlocksEditor() {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(everyBlock);
  const [extensions] = useState(() => catalogue({ mention: { search: searchPeople }, diagram: { render: renderDiagram } }));
  const [handle, setHandle] = useState<QuoinEditorHandle | null>(null);
  const highlight = usePrismHighlighter();
  return (
    <>
      <BlockCanvas
        ref={setHandle}
        blocks={blocks}
        onChange={setBlocks}
        extensions={extensions}
        highlight={highlight}
        resolveAssetUrl={resolveAssetUrl}
        aria-label="Every block"
        className="editor-frame"
      />
      {handle && (
        <QuoinSource
          controller={handle.controller}
          options={{ resolveAssetUrl }}
          className="editor-source"
        />
      )}
    </>
  );
}
