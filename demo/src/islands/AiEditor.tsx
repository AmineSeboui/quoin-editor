import { useState } from 'react';
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { aiDocument } from '../content/ai-document';
import { aiExtension } from 'quoin-editor/ai';
import { simulatedModel } from './simulated-model';

export default function AiEditor() {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(aiDocument);
  const [extensions] = useState(() => [aiExtension({ stream: simulatedModel })]);
  return <BlockCanvas blocks={blocks} onChange={setBlocks} extensions={extensions} aria-label="AI document" className="editor-frame" />;
}
