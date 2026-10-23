import { useState } from 'react';
import { BlockCanvas, toMarkdown, type QuoinBlock } from 'quoin-editor';
import { homeDocument } from '../content/home-document';
import { useSettled } from './use-settled';

const PAUSE = 300;

export default function HomeEditor() {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(homeDocument);
  const stored = useSettled(blocks, PAUSE);
  return (
    <div className="editor-pair">
      <BlockCanvas blocks={blocks} onChange={setBlocks} aria-label="Sample document" className="editor-frame" />
      <section className="markdown-panel" aria-labelledby="stored-heading">
        <h2 id="stored-heading">What onChange hands you, as markdown</h2>
        <p className="panel-note">It shows what is stored once you pause typing for {PAUSE} ms.</p>
        <pre>{toMarkdown(stored)}</pre>
      </section>
    </div>
  );
}
