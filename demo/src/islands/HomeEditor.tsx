import { useState } from 'react';
import { BlockCanvas, toMarkdown, type QuoinBlock } from 'quoin-editor';
import { homeDocument } from '../content/home-document';

export default function HomeEditor() {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(homeDocument);
  return (
    <div className="editor-pair">
      <BlockCanvas blocks={blocks} onChange={setBlocks} aria-label="Sample document" className="editor-frame" />
      <section className="markdown-panel" aria-labelledby="stored-heading">
        <h2 id="stored-heading">What onChange hands you, as markdown</h2>
        <pre>{toMarkdown(blocks)}</pre>
      </section>
    </div>
  );
}
