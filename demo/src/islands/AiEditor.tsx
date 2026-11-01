import { useState } from 'react';
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { aiDocument } from '../content/ai-document';
import { aiExtension } from 'quoin-editor/ai';
import { liveModel } from './live-model';
import { simulatedModel } from './simulated-model';

const model = import.meta.env.MODE === 'ai' ? liveModel : simulatedModel;

export default function AiEditor() {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(aiDocument);
  const [extensions] = useState(() => [aiExtension({ stream: model })]);
  return <BlockCanvas blocks={blocks} onChange={setBlocks} extensions={extensions} aria-label="AI document" className="editor-frame" />;
}
