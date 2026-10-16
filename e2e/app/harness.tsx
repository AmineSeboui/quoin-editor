import { useState } from 'react';
import { BlockCanvas, coreBlocks, type QuoinBlock } from 'quoin-editor';
import { bookmarkDemo } from './bookmark-demo';

const blockTypes = [...coreBlocks, bookmarkDemo];

const docs: Record<string, QuoinBlock[]> = {
  empty: [],
  sample: [
    { id: 'a', type: 'MARKDOWN', data: { markdown: '# Title' } },
    { id: 'b', type: 'MARKDOWN', data: { markdown: 'First paragraph.' } },
  ],
  custom: [
    { id: 'above', type: 'MARKDOWN', data: { markdown: 'Paragraph above' } },
    { id: 'bm', type: 'BOOKMARK_DEMO', data: { url: 'https://quoin.dev' } },
    { id: 'below', type: 'MARKDOWN', data: { markdown: 'Paragraph below' } },
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
      blockTypes={blockTypes}
      onChange={(next) => {
        window.__quoin.changes += 1;
        setBlocks(next);
      }}
    />
  );
}
