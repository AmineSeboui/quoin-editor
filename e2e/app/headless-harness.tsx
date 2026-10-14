import { useEffect, useState } from 'react';
import type { QuoinBlock } from 'quoin-editor';
import { toggleMark } from 'quoin-editor/engine';
import { EditorView, useQuoinEditor, type RenderOptions, type ViewController } from 'quoin-editor/headless';

const md = (id: string, markdown: string, indent = 0): QuoinBlock => ({
  id,
  type: 'MARKDOWN',
  data: { markdown },
  ...(indent > 0 ? { indent } : {}),
});

const MONOSPACE = new Set(['columns', 'ragged']);

// How the page hands onChange's blocks back: at once, a tick later, as a deep copy, or never.
const ECHO = new URLSearchParams(location.search).get('echo') ?? 'immediate';

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
  three: [md('a', 'Alpha beta gamma'), md('b', 'Delta epsilon'), md('c', 'Zeta eta theta')],
  columns: [md('c1', 'abcdefgh'), md('c2', 'ijklmnop'), md('c3', 'qrstuvwx')],
  ragged: [md('r1', 'abcdefgh'), md('r2', 'ij'), md('r3', 'qrstuvwx')],
  divider: [md('a', 'a'), { id: 'd', type: 'DIVIDER', data: {} }, md('b', 'b')],
  image: [md('a', 'one'), { id: 'i', type: 'IMAGE', data: { storageKey: 'k', alt: 'An image' } }, md('b', 'two')],
  list: [md('l1', '- one'), md('l2', '- two'), md('l3', '- three')],
  closed: [md('a', 'one'), { id: 't', type: 'TOGGLE', data: { markdown: 'T', open: false } }, md('c', 'child', 1)],
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

// Typing, keys and commands all reach the document through edit(), and dispatch() calls it too, so one wrapper times the
// change, the React flush, the host render and the selection write together. A key that changes nothing is not an edit.
function timeEdits(controller: ViewController): () => void {
  const edit = controller.edit.bind(controller);
  controller.edit = (change) => {
    const before = controller.editor.state;
    const start = performance.now();
    const handled = edit(change);
    if (controller.editor.state !== before) window.__quoin.timings?.push(performance.now() - start);
    return handled;
  };
  return () => {
    controller.edit = edit;
  };
}

export function HeadlessHarness({ doc }: { doc: string }) {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(docs[doc] ?? []);
  const controller = useQuoinEditor({
    blocks,
    render: doc === 'atoms' ? MENTION_CHIPS : undefined,
    onChange: (next) => {
      window.__quoin.changes += 1;
      if (ECHO === 'immediate') setBlocks(next);
      else if (ECHO === 'late') setTimeout(() => setBlocks(next), 0);
      else if (ECHO === 'clone') setBlocks(structuredClone(next));
    },
    onFiles: (files, at) => window.__quoin.files?.push({ names: files.map((file) => file.name), at }),
  });
  window.__quoin = {
    blocks: () => blocks,
    setBlocks,
    changes: window.__quoin?.changes ?? 0,
    controller,
    files: window.__quoin?.files ?? [],
    timings: window.__quoin?.timings ?? [],
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
