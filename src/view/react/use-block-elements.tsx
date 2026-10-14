import { useState, type ReactElement } from 'react';
import type { EngineBlock } from '../../engine';
import { BlockShell } from './BlockShell';
import type { BlockRenderer } from './block-renderer-types';

type Renderers = Readonly<Record<string, BlockRenderer>>;
type Made = { readonly renderers: Renderers; readonly element: ReactElement };

// React skips a child whose element is the very object it rendered last time. A block is replaced when it changes, so
// handing back the element made for the same block object turns a keystroke from one element per block into one. A
// block's position is not part of its element: a shell that needs it reads it from the document.
export function useBlockElements(blocks: readonly EngineBlock[], renderers: Renderers): ReactElement[] {
  const [made] = useState(() => new WeakMap<EngineBlock, Made>());
  return blocks.map((block) => {
    const known = made.get(block);
    if (known?.renderers === renderers) return known.element;
    const element = <BlockShell key={block.id} block={block} renderers={renderers} />;
    made.set(block, { renderers, element });
    return element;
  });
}
