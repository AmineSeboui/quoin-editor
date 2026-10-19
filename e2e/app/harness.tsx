import { useState } from 'react';
import { BlockCanvas, coreBlocks, type QuoinBlock } from 'quoin-editor';
import { bookmarkDemo } from './bookmark-demo';
import { noteDemo } from './note-demo';

const blockTypes = [...coreBlocks, bookmarkDemo, noteDemo];

const READ_ONLY = new URLSearchParams(location.search).get('readonly') === '1';

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
  link: [
    { id: 'p', type: 'MARKDOWN', data: { markdown: 'Read [the docs](https://quoin.dev/docs) today' } },
    { id: 'q', type: 'MARKDOWN', data: { markdown: 'Plain words to link' } },
  ],
  custom: [
    { id: 'above', type: 'MARKDOWN', data: { markdown: 'Paragraph above' } },
    { id: 'bm', type: 'BOOKMARK_DEMO', data: { url: 'https://quoin.dev' } },
    { id: 'below', type: 'MARKDOWN', data: { markdown: 'Paragraph below' } },
  ],
  pinned: [
    { id: 'pn', type: 'NOTE_DEMO', data: { note: 'Pinned' } },
    { id: 'p', type: 'MARKDOWN', data: { markdown: 'Paragraph below' } },
  ],
  rich: [
    { id: 'h', type: 'MARKDOWN', data: { markdown: '# Release notes' } },
    { id: 'p', type: 'MARKDOWN', data: { markdown: 'Keeps **bold**, _italic_, `code` and [links](https://quoin.dev/docs).' } },
    { id: 'l', type: 'MARKDOWN', data: { markdown: '- Write the notes' } },
    { id: 'k', type: 'MARKDOWN', data: { markdown: '- [x] Ship it' } },
    { id: 'q', type: 'MARKDOWN', data: { markdown: '> Small steps' } },
    { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'Read the guide first' } },
    { id: 't', type: 'TOGGLE', data: { markdown: 'Details', open: true } },
    { id: 'tc', type: 'MARKDOWN', data: { markdown: 'Hidden detail' }, indent: 1 },
    { id: 'd', type: 'DIVIDER', data: {} },
    { id: 'bm', type: 'BOOKMARK_DEMO', data: { url: 'https://quoin.dev' } },
    { id: 'code', type: 'CODE', data: { language: 'ts', code: 'const answer = 42;' } },
  ],
};

export function Harness({ doc }: { doc: string }) {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(docs[doc] ?? []);
  window.__quoin = { blocks: () => blocks, changes: window.__quoin?.changes ?? 0 };
  return (
    <>
      <BlockCanvas
        aria-label="Document"
        placeholder="Write something"
        blocks={blocks}
        blockTypes={blockTypes}
        readOnly={READ_ONLY}
        onChange={(next) => {
          window.__quoin.changes += 1;
          setBlocks(next);
        }}
      />
      <input aria-label="After the editor" />
    </>
  );
}
