import { useContext } from 'react';
import type { BlockRenderer } from './block-renderer-types';
import { CalloutBlock } from './callout-block';
import { MarkdownBlock } from './markdown-block';
import { ToggleBlock } from './toggle-block';
import { UnsupportedBlockLabel } from './unsupported-block-label';

export type { BlockRenderProps, BlockRenderer } from './block-renderer-types';

/**
 * @deprecated Internal to the view layer and removed in 2.0.0: a renderer of your own draws a block's text with
 * `EditableRegion`, which is what each of these three does.
 */
export const defaultRenderers: Readonly<Record<string, BlockRenderer>> = {
  MARKDOWN: MarkdownBlock,
  CALLOUT: CalloutBlock,
  TOGGLE: ToggleBlock,
};

/**
 * @deprecated Internal to the view layer and removed in 2.0.0: a block shell falls back to it already when no
 * renderer draws a block's type.
 */
export const VoidBlockFallback: BlockRenderer = ({ block }) => {
  const label = useContext(UnsupportedBlockLabel);
  if (block.type === 'DIVIDER') return <div className="quoin-void" contentEditable={false} role="separator" />;
  return (
    <div className="quoin-void" contentEditable={false} role="group" aria-label={label}>
      {label}
    </div>
  );
};
