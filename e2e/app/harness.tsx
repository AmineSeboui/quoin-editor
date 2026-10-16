import { useState } from 'react';
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';

const docs: Record<string, QuoinBlock[]> = {
  empty: [],
  sample: [
    { id: 'a', type: 'MARKDOWN', data: { markdown: '# Title' } },
    { id: 'b', type: 'MARKDOWN', data: { markdown: 'First paragraph.' } },
  ],
};

export function Harness({ doc }: { doc: string }) {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(docs[doc] ?? []);
  window.__quoin = { blocks: () => blocks, changes: window.__quoin?.changes ?? 0 };
  return (
    <BlockCanvas
      aria-label="Document"
      placeholder="Write something"
      blocks={blocks}
      onChange={(next) => {
        window.__quoin.changes += 1;
        setBlocks(next);
      }}
    />
  );
}
