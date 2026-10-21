import { useEffect, useState } from 'react';
import type { QuoinBlock } from 'quoin-editor';
import { toggleMark } from 'quoin-editor/engine';
import { EditorView, useQuoinEditor, type RenderOptions } from 'quoin-editor/headless';
import { collaborative } from './collab-extensions';
import { timeEdits } from './time-edits';

const md = (id: string, markdown: string, indent = 0): QuoinBlock => ({
  id,
  type: 'MARKDOWN',
  data: { markdown },
  ...(indent > 0 ? { indent } : {}),
});

const MONOSPACE = new Set(['columns', 'ragged', 'breaks']);
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

const PARAMS = new URLSearchParams(location.search);

// How the page hands onChange's blocks back: at once, a tick later, as a deep copy, as a deep copy a tick later, as a new
// array of the same blocks, or never.
const ECHO = PARAMS.get('echo') ?? 'immediate';
const READ_ONLY = PARAMS.get('readonly') === '1';
const COLLABORATION = PARAMS.get('collab') === '1' ? collaborative(Number(PARAMS.get('presence') ?? 0)) : undefined;

const docs: Record<string, QuoinBlock[]> = {
  empty: [],
  sample: [
    md('h', '# Headless sample'),
    md('p', 'A paragraph with **bold**, _italic_ and `code`.'),
    md('b', '- a bullet'),
    md('n', '- a nested bullet', 1),
    md('t', '- [ ] a task'),
    md('q', '> a quote'),
    { id: 'd', type: 'DIVIDER', data: {} },
    { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'A callout' } },
  ],
  large: Array.from({ length: 1000 }, (_, i) => md(`p${i}`, `Paragraph ${i} of a large document, with some words in it.`)),
  forty: Array.from({ length: 40 }, (_, i) => md(`p${i}`, `Paragraph ${i} of a large document, with some words in it.`)),
  three: [md('a', 'Alpha beta gamma'), md('b', 'Delta epsilon'), md('c', 'Zeta eta theta')],
  columns: [md('c1', 'abcdefgh'), md('c2', 'ijklmnop'), md('c3', 'qrstuvwx')],
  ragged: [md('r1', 'abcdefgh'), md('r2', 'ij'), md('r3', 'qrstuvwx')],
  breaks: [md('r1', ALPHABET), md('r2', `ab\\\n${ALPHABET}`), md('r3', ALPHABET), md('r4', 'ab'), md('r5', ALPHABET)],
  wrapped: [
    md('p', 'The quick brown fox jumps over the lazy dog and keeps running across the wide green field until dusk falls on the quiet hills nearby. Yes.'),
    md('q', 'Another fairly long line of text that sits right below it here.'),
  ],
  divider: [md('a', 'a'), { id: 'd', type: 'DIVIDER', data: {} }, md('b', 'b')],
  image: [md('a', 'one'), { id: 'i', type: 'IMAGE', data: { storageKey: 'k', alt: 'An image' } }, md('b', 'two')],
  list: [md('l1', '- one'), md('l2', '- two'), md('l3', '- three')],
  closed: [md('a', 'one'), { id: 't', type: 'TOGGLE', data: { markdown: 'T', open: false } }, md('c', 'child', 1)],
  flip: [
    md('p', 'plain'),
    md('k', '- [ ] a task'),
    { id: 't', type: 'TOGGLE', data: { markdown: 'Toggle text', open: true } },
    md('c', 'child', 1),
    md('s', 'sibling'),
  ],
  atoms: [md('a', 'Hi [@Ada](mention:u1) there')],
};

const MENTION_CHIPS: RenderOptions = {
  atoms: {
    mention: (node, doc) => {
      const chip = doc.createElement('b');
      chip.textContent = `@${node.attrs.label}`;
      return chip;
    },
  },
};

export function HeadlessHarness({ doc }: { doc: string }) {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(docs[doc] ?? []);
  const controller = useQuoinEditor({
    blocks,
    render: doc === 'atoms' ? MENTION_CHIPS : COLLABORATION?.render,
    onChange: (next) => {
      window.__quoin.changes += 1;
      if (ECHO === 'immediate') setBlocks(next);
      else if (ECHO === 'late') setTimeout(() => setBlocks(next), 0);
      else if (ECHO === 'clone') setBlocks(structuredClone(next));
      else if (ECHO === 'lateclone') setTimeout(() => setBlocks(structuredClone(next)), 0);
      else if (ECHO === 'mapped') setBlocks(next.map((block) => block));
    },
    readOnly: READ_ONLY,
    extensions: COLLABORATION?.extensions,
    onFiles: (files, at) => window.__quoin.files?.push({ names: files.map((file) => file.name), at }),
  });
  window.__quoin = {
    blocks: () => blocks,
    setBlocks,
    changes: window.__quoin?.changes ?? 0,
    controller,
    files: window.__quoin?.files ?? [],
    timings: window.__quoin?.timings ?? [],
    sharedText: COLLABORATION?.sharedText,
  };
  useEffect(() => timeEdits(controller), [controller]);
  return (
    <>
      <button type="button" onClick={() => controller.run(toggleMark('bold'))}>
        Bold
      </button>
      <EditorView
        controller={controller}
        aria-label="Document"
        placeholder="Start writing"
        className={MONOSPACE.has(doc) ? 'harness-monospace' : undefined}
      />
      <button type="button">After the editor</button>
    </>
  );
}
