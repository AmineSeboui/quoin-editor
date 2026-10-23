import { useState } from 'react';
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { catalogue } from 'quoin-editor/catalogue';
import type { MentionResult } from 'quoin-editor/mention';
import { everyBlock } from '../content/every-block';
import { BASE } from '../site/site';

const PEOPLE: MentionResult[] = [
  { id: 'ada', label: 'Ada Lovelace', kind: 'user', description: 'Mathematician' },
  { id: 'grace', label: 'Grace Hopper', kind: 'user', description: 'Computer scientist' },
  { id: 'alan', label: 'Alan Turing', kind: 'user', description: 'Computer scientist' },
];

const search = async (query: string) =>
  PEOPLE.filter(({ label }) => label.toLowerCase().includes(query.toLowerCase()));

const resolveAssetUrl = (storageKey: string) => `${BASE}${storageKey}`;

export default function BlocksEditor() {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(everyBlock);
  const [extensions] = useState(() => catalogue({ mention: { search } }));
  return (
    <BlockCanvas
      blocks={blocks}
      onChange={setBlocks}
      extensions={extensions}
      resolveAssetUrl={resolveAssetUrl}
      aria-label="Every block"
      className="editor-frame"
    />
  );
}
