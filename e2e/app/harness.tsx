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
  text: [
    { id: 'h', type: 'MARKDOWN', data: { markdown: '# Text blocks' } },
    { id: 'r', type: 'MARKDOWN', data: { markdown: 'Red and centred', color: 'red', align: 'center' } },
    { id: 'y', type: 'MARKDOWN', data: { markdown: 'On yellow', background: 'yellow' } },
    { id: 'h2', type: 'MARKDOWN', data: { markdown: '## Section' } },
    { id: 'b', type: 'MARKDOWN', data: { markdown: '- Bullet' } },
    { id: 'n', type: 'MARKDOWN', data: { markdown: '1. Numbered' }, indent: 1 },
    { id: 'k', type: 'MARKDOWN', data: { markdown: '- [x] Done' } },
    { id: 'q', type: 'MARKDOWN', data: { markdown: '> Quoted' } },
    { id: 'c', type: 'CALLOUT', data: { tone: 'warning', body: 'Careful' } },
    { id: 't', type: 'TOGGLE', data: { markdown: 'Details', open: true } },
    { id: 'tc', type: 'MARKDOWN', data: { markdown: 'Hidden detail' }, indent: 1 },
    { id: 'd', type: 'DIVIDER', data: {} },
    { id: 'e', type: 'MARKDOWN', data: { markdown: 'The end' } },
  ],
  drag: [
    { id: 'a', type: 'MARKDOWN', data: { markdown: 'Alpha' } },
    { id: 'b', type: 'MARKDOWN', data: { markdown: 'Bravo' } },
    { id: 'c', type: 'MARKDOWN', data: { markdown: 'Charlie' } },
    { id: 'l', type: 'MARKDOWN', data: { markdown: '- List item' } },
    { id: 'd', type: 'MARKDOWN', data: { markdown: 'Delta' } },
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
