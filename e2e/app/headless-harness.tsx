import { useState } from 'react';
import type { QuoinBlock } from 'quoin-editor';
import { EditorView, useQuoinEditor } from 'quoin-editor/headless';

const md = (id: string, markdown: string, indent = 0): QuoinBlock => ({
  id,
  type: 'MARKDOWN',
  data: { markdown },
  ...(indent > 0 ? { indent } : {}),
});

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
};

export function HeadlessHarness({ doc }: { doc: string }) {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(docs[doc] ?? []);
  const controller = useQuoinEditor({
    blocks,
    onChange: (next) => {
      window.__quoin.changes += 1;
      setBlocks(next);
    },
  });
  window.__quoin = { blocks: () => blocks, changes: window.__quoin?.changes ?? 0, controller };
  return <EditorView controller={controller} aria-label="Document" placeholder="Start writing" />;
}
