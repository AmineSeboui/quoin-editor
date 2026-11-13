import { calloutTone } from '../../engine/blocks/callout-tones';
import type { BlockRenderer } from './block-renderer-types';
import { EditableRegion } from './EditableRegion';
import { useRendererLabels } from './renderer-labels-context';

export const CalloutBlock: BlockRenderer = ({ block }) => {
  const labels = useRendererLabels();
  const tone = calloutTone(block.attrs.tone);
  return (
    <div className="quoin-callout" data-tone={tone}>
      <EditableRegion block={block.id} region="body" label={labels.callout(labels.calloutTones[tone])} />
    </div>
  );
};
