import type { BlockRenderer } from '../../view';
import { CalloutBlock } from './CalloutBlock';
import { DividerBlock } from './DividerBlock';
import { MarkdownBlock } from './MarkdownBlock';
import { ToggleBlock } from './ToggleBlock';

export const textRenderers: Readonly<Record<'MARKDOWN' | 'CALLOUT' | 'TOGGLE' | 'DIVIDER', BlockRenderer>> = {
  MARKDOWN: MarkdownBlock,
  CALLOUT: CalloutBlock,
  TOGGLE: ToggleBlock,
  DIVIDER: DividerBlock,
};
