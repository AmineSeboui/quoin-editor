import { useState } from 'react';
import { BlockCanvas, coreBlocks, type QuoinBlock, type UploadFn } from 'quoin-editor';
import { bookmarkDemo } from './bookmark-demo';
import { fixtureDataUrl } from './fixture-png';
import { noteDemo } from './note-demo';

const blockTypes = [...coreBlocks, bookmarkDemo, noteDemo];

const params = new URLSearchParams(location.search);
const READ_ONLY = params.get('readonly') === '1';
const UPLOAD_DELAY = params.get('upload');

// Each upload is kept as an object URL under its key, so the picture of an uploaded image loads.
const uploads = new Map<string, string>([['fixture.png', fixtureDataUrl]]);

const upload: UploadFn | undefined =
  UPLOAD_DELAY === null
    ? undefined
    : (file) =>
        new Promise((resolve) => {
          const stored = { storageKey: `key-${file.name}`, filename: file.name, size: file.size };
          uploads.set(stored.storageKey, URL.createObjectURL(file));
          setTimeout(() => resolve(stored), Number(UPLOAD_DELAY));
        });

const resolveAssetUrl = (storageKey: string) => uploads.get(storageKey) ?? storageKey;

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
  code: [
    { id: 'p', type: 'MARKDOWN', data: { markdown: 'Above the code' } },
    { id: 'k', type: 'CODE', data: { language: 'ts', code: 'let a = 1;\nlet b = 2;' } },
    { id: 'q', type: 'MARKDOWN', data: { markdown: 'Below the code' } },
  ],
  'long-code': [
    { id: 'p', type: 'MARKDOWN', data: { markdown: 'Above the code' } },
    { id: 'k', type: 'CODE', data: { language: 'ts', code: `const line = '${'x'.repeat(150)}';` } },
  ],
  media: [
    { id: 'p', type: 'MARKDOWN', data: { markdown: 'Above media' } },
    { id: 'img', type: 'IMAGE', data: { storageKey: '', alt: '' } },
    { id: 'q', type: 'MARKDOWN', data: { markdown: 'Below media' } },
  ],
  image: [
    { id: 'p', type: 'MARKDOWN', data: { markdown: 'Above the image' } },
    { id: 'img', type: 'IMAGE', data: { storageKey: 'fixture.png', alt: 'A red square', widthPercent: 50 } },
    { id: 'd', type: 'DIVIDER', data: {} },
    { id: 'q', type: 'MARKDOWN', data: { markdown: 'Below the image' } },
  ],
  file: [
    { id: 'p', type: 'MARKDOWN', data: { markdown: 'Above the file' } },
    { id: 'f', type: 'FILE', data: { storageKey: 'notes.pdf', filename: 'notes.pdf', size: 1536, mime: 'application/pdf' } },
    { id: 'e', type: 'FILE', data: { storageKey: '', filename: '' } },
    { id: 'q', type: 'MARKDOWN', data: { markdown: 'Below the file' } },
  ],
  closed: [
    { id: 't', type: 'TOGGLE', data: { markdown: 'Details', open: false } },
    { id: 'tc', type: 'MARKDOWN', data: { markdown: 'Hidden detail' }, indent: 1 },
    { id: 'e', type: 'MARKDOWN', data: { markdown: 'The end' } },
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
        upload={upload}
        resolveAssetUrl={resolveAssetUrl}
        onChange={(next) => {
          window.__quoin.changes += 1;
          setBlocks(next);
        }}
      />
      <input aria-label="After the editor" />
    </>
  );
}
