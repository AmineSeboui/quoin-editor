import type { BlockRenderer } from './block-renderer-types';
import { calloutTone } from '../../engine/blocks/callout-tones';
import { EditableRegion } from './EditableRegion';

export const CalloutBlock: BlockRenderer = ({ block }) => {
  const tone = calloutTone(block.attrs.tone);
  return (
    <div className="quoin-callout" data-tone={tone}>
      <EditableRegion block={block.id} region="body" label={`Callout, ${tone}`} />
    </div>
  );
};
