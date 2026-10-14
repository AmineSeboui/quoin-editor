import type { BlockRenderer } from './block-renderer-types';
import { EditableRegion } from './EditableRegion';

export const CalloutBlock: BlockRenderer = ({ block }) => {
  const tone = typeof block.attrs.tone === 'string' && block.attrs.tone !== '' ? block.attrs.tone : 'info';
  return (
    <div className="quoin-callout" data-tone={tone}>
      <EditableRegion block={block.id} region="body" label={`Callout, ${tone}`} />
    </div>
  );
};
