import { useEffect, useRef, useState } from 'react';
import { BlockCanvas, coreBlocks, type QuoinBlock, type QuoinEditorHandle, type UploadFn } from 'quoin-editor';
import { removeBlocksStep } from 'quoin-editor/headless';
import { bookmarkDemo } from './bookmark-demo';
import { fixtureDataUrl } from './fixture-png';
import { everyBlock } from './every-block-doc';
import { EVERY_FEATURE, extensions } from './harness-extensions';
import { noteDemo } from './note-demo';
import { timeEdits } from './time-edits';

const blockTypes = EVERY_FEATURE ? coreBlocks : [...coreBlocks, bookmarkDemo, noteDemo];

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

const grid = (rows: number, cols: number) =>
  Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (_, col) => `r${row}c${col}`));

// Enough lines under each heading that the next one starts below the fold.
const section = (id: string, level: number, title: string): QuoinBlock[] => [
  { id, type: 'MARKDOWN', data: { markdown: `${'#'.repeat(level)} ${title}` } },
  ...Array.from({ length: 30 }, (_, line) => ({
    id: `${id}-${line}`,
    type: 'MARKDOWN',
    data: { markdown: `Line ${line + 1} of ${title}` },
  })),
];

const paragraphs = (count: number): QuoinBlock[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    type: 'MARKDOWN',
    data: { markdown: `Paragraph ${i} of a large document, with some words in it.` },
  }));

const docs: Record<string, QuoinBlock[]> = {
  empty: [],
  every: everyBlock,
  large: paragraphs(1000),
  forty: paragraphs(40),
  find: [
    { id: 'a', type: 'MARKDOWN', data: { markdown: 'A cat sat on the **cat** mat' } },
    { id: 'b', type: 'MARKDOWN', data: { markdown: 'The cat came back' } },
    ...Array.from({ length: 40 }, (_, line) => ({
      id: `f${line}`,
      type: 'MARKDOWN',
      data: { markdown: `Filler line ${line + 1}` },
    })),
    { id: 'z', type: 'MARKDOWN', data: { markdown: 'The last cat' } },
  ],
  table: [
    { id: 'p', type: 'MARKDOWN', data: { markdown: 'Above the table' } },
    { id: 't', type: 'TABLE', data: { rows: grid(3, 3), header: true, align: [null, null, null] } },
    { id: 'q', type: 'MARKDOWN', data: { markdown: 'Below the table' } },
  ],
  'wide-table': [
    { id: 'p', type: 'MARKDOWN', data: { markdown: 'Above the table' } },
    { id: 't', type: 'TABLE', data: { rows: grid(2, 16), header: true, align: Array(16).fill(null) } },
  ],
  embeds: [
    { id: 'p', type: 'MARKDOWN', data: { markdown: 'Above the embeds' } },
    { id: 'e', type: 'EMBED', data: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', provider: 'youtube' } },
    {
      id: 'b',
      type: 'BOOKMARK',
      data: {
        url: 'https://quoin.dev/docs',
        title: 'Quoin docs',
        description: 'How to write with Quoin',
        image: 'https://cdn.quoin.test/cover.png',
      },
    },
    { id: 's', type: 'EMBED', data: { url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC', provider: 'spotify' } },
    { id: 'q', type: 'MARKDOWN', data: { markdown: 'Below the embeds' } },
  ],
  math: [
    { id: 'p', type: 'MARKDOWN', data: { markdown: 'Area $x^2$ here' } },
    { id: 'm', type: 'MATH', data: { latex: '\\int_0^1 x\\,dx' } },
    { id: 'q', type: 'MARKDOWN', data: { markdown: 'Below the equation' } },
  ],
  mention: [
    { id: 'p', type: 'MARKDOWN', data: { markdown: 'Ask [@Ada Lovelace](mention:user:1) today' } },
    { id: 'q', type: 'MARKDOWN', data: { markdown: 'Below the mention' } },
  ],
  toc: [
    { id: 'toc', type: 'TOC', data: {} },
    ...section('intro', 1, 'Introduction'),
    ...section('setup', 2, 'Setting up'),
    ...section('usage', 3, 'Using it'),
  ],
  comments: [
    { id: 'p', type: 'MARKDOWN', data: { markdown: 'A first paragraph to comment on.' } },
    { id: 'q', type: 'MARKDOWN', data: { markdown: 'Ask <span data-comment="seeded">about this</span> here.' } },
    { id: 'r', type: 'MARKDOWN', data: { markdown: 'The last paragraph.' } },
  ],
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
  const handle = useRef<QuoinEditorHandle>(null);
  window.__quoin = {
    blocks: () => blocks,
    setBlocks,
    changes: window.__quoin?.changes ?? 0,
    opened: window.__quoin?.opened ?? [],
    timings: window.__quoin?.timings ?? [],
    get controller() {
      return handle.current?.controller;
    },
    removeRemotely(id: string) {
      const { editor } = handle.current!.controller;
      const tr = editor.createTransaction().setOrigin('remote').setMeta('addToHistory', false);
      editor.dispatch(tr.step(removeBlocksStep(editor.state.doc.index.get(id)!, 1)));
    },
  };
  useEffect(() => (handle.current === null ? undefined : timeEdits(handle.current.controller)), []);
  return (
    <>
      <BlockCanvas
        ref={handle}
        aria-label="Document"
        placeholder="Write something"
        blocks={blocks}
        blockTypes={blockTypes}
        readOnly={READ_ONLY}
        extensions={extensions}
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
