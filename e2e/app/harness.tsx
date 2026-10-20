import { useState } from 'react';
import { BlockCanvas, coreBlocks, type QuoinBlock, type UploadFn } from 'quoin-editor';
import { embedExtension, type Unfurl } from 'quoin-editor/embed';
import { emojiExtension } from 'quoin-editor/emoji';
import { mathExtension, type RenderMath } from 'quoin-editor/math';
import { mentionExtension, type MentionResult } from 'quoin-editor/mention';
import { tableExtension } from 'quoin-editor/table';
import { tocExtension } from 'quoin-editor/toc';
import { bookmarkDemo } from './bookmark-demo';
import { fixtureDataUrl } from './fixture-png';
import { noteDemo } from './note-demo';

const blockTypes = [...coreBlocks, bookmarkDemo, noteDemo];

const params = new URLSearchParams(location.search);
const READ_ONLY = params.get('readonly') === '1';
const UPLOAD_DELAY = params.get('upload');
// Stands in for a server that reads a page's metadata, so no test depends on the network.
const UNFURL_DELAY = Number(params.get('unfurl') ?? 0);
const unfurl: Unfurl = (url) =>
  new Promise((resolve) =>
    setTimeout(() => resolve({ title: `Unfurled ${new URL(url).hostname}`, description: 'Found by the host' }), UNFURL_DELAY),
  );
// Stands in for a host's renderer, such as KaTeX, so no test needs a math library.
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const renderMath: RenderMath = (latex, { displayMode }) =>
  `<span class="harness-math" data-display="${displayMode}">${escapeHtml(latex)}</span>`;
const MATH = params.get('math');
// Stands in for a host's directory of people, answering after a delay as a server would.
const PEOPLE: MentionResult[] = [
  { id: '1', label: 'Ada Lovelace', kind: 'user', description: 'Mathematician' },
  { id: '2', label: 'Alan Turing', kind: 'user', description: 'Computer scientist' },
  { id: '3', label: 'Adele Goldberg', kind: 'user', avatarUrl: 'https://cdn.quoin.test/adele.png' },
];
const MENTION_DELAY = Number(params.get('mentiondelay') ?? 0);
const searchPeople = (query: string) =>
  new Promise<MentionResult[]>((resolve) =>
    setTimeout(() => resolve(PEOPLE.filter(({ label }) => label.toLowerCase().includes(query.toLowerCase()))), MENTION_DELAY),
  );
const extensions = [
  ...(params.get('table') === '1' ? [tableExtension()] : []),
  ...(params.get('embed') === '1' ? [embedExtension({ unfurl })] : []),
  ...(MATH === null ? [] : [mathExtension({ renderMath: MATH === 'source' ? undefined : renderMath })]),
  ...(params.get('toc') === '1' ? [tocExtension()] : []),
  ...(params.get('mention') === '1'
    ? [mentionExtension({ search: searchPeople, onOpen: (mention) => window.__quoin.opened?.push(mention) })]
    : []),
  ...(params.get('emoji') === '1' ? [emojiExtension()] : []),
];

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

const docs: Record<string, QuoinBlock[]> = {
  empty: [],
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
  window.__quoin = {
    blocks: () => blocks,
    setBlocks,
    changes: window.__quoin?.changes ?? 0,
    opened: window.__quoin?.opened ?? [],
  };
  return (
    <>
      <BlockCanvas
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
