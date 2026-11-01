import { useState } from 'react';
import { BlockCanvas, toMarkdown, type QuoinBlock } from 'quoin-editor';
import { homeDocument } from '../content/home-document';
import { SETTLE_DELAY, StorageWindow } from '../site/StorageWindow';
import { useSettled } from './use-settled';

export default function HomeEditor() {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(homeDocument);
  const stored = useSettled(blocks, SETTLE_DELAY);
  return (
    <StorageWindow
      screen={<BlockCanvas blocks={blocks} onChange={setBlocks} aria-label="Sample document" />}
      markdown={toMarkdown(stored)}
    />
  );
}
