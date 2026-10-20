import { useContext } from 'react';
import type { BlockRenderer } from './block-renderer-types';
import { CalloutBlock } from './callout-block';
import { MarkdownBlock } from './markdown-block';
import { ToggleBlock } from './toggle-block';
import { UnsupportedBlockLabel } from './unsupported-block-label';

export type { BlockRenderProps, BlockRenderer } from './block-renderer-types';

export const defaultRenderers: Readonly<Record<string, BlockRenderer>> = {
  MARKDOWN: MarkdownBlock,
  CALLOUT: CalloutBlock,
  TOGGLE: ToggleBlock,
};

export const VoidBlockFallback: BlockRenderer = ({ block }) => {
  const label = useContext(UnsupportedBlockLabel);
  if (block.type === 'DIVIDER') return <div className="quoin-void" contentEditable={false} role="separator" />;
  return (
    <div className="quoin-void" contentEditable={false} role="group" aria-label={label}>
      {label}
    </div>
  );
};
