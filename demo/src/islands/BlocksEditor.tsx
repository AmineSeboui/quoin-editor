import { useState } from 'react';
import { BlockCanvas, type QuoinBlock, type QuoinEditorHandle } from 'quoin-editor';
import { catalogue } from 'quoin-editor/catalogue';
import { usePrismHighlighter } from 'quoin-editor/highlight';
import type { MentionResult } from 'quoin-editor/mention';
import { QuoinSource } from 'quoin-editor/source';
import { everyBlock } from '../content/every-block';
import { resolveAssetUrl } from '../site/asset-url';

const PEOPLE: MentionResult[] = [
  { id: 'ada', label: 'Ada Lovelace', kind: 'user', description: 'Mathematician' },
  { id: 'grace', label: 'Grace Hopper', kind: 'user', description: 'Computer scientist' },
  { id: 'alan', label: 'Alan Turing', kind: 'user', description: 'Computer scientist' },
];

const search = async (query: string) =>
  PEOPLE.filter(({ label }) => label.toLowerCase().includes(query.toLowerCase()));

export default function BlocksEditor() {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(everyBlock);
  const [extensions] = useState(() => catalogue({ mention: { search } }));
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
