import type { BlockRenderer } from './block-renderer-types';
import { CalloutBlock } from './callout-block';
import { MarkdownBlock } from './markdown-block';
import { ToggleBlock } from './toggle-block';

export type { BlockRenderProps, BlockRenderer } from './block-renderer-types';

export const defaultRenderers: Readonly<Record<string, BlockRenderer>> = {
  MARKDOWN: MarkdownBlock,
  CALLOUT: CalloutBlock,
  TOGGLE: ToggleBlock,
};

export const VoidBlockFallback: BlockRenderer = ({ block }) => (
  <div className="quoin-void" contentEditable={false}>
    {block.type}
  </div>
);
