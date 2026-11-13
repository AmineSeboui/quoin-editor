import { useBlockDomId } from './block-dom-id';
import type { BlockRenderer } from './block-renderer-types';
import { EditableRegion } from './EditableRegion';
import { useRendererLabels } from './renderer-labels-context';
import { ToggleChevron } from './ToggleChevron';
import { useNestedBlocks } from './use-nested-blocks';
import { useToggleOpen } from './use-reader-choices';

export const ToggleBlock: BlockRenderer = ({ block, controller }) => {
  const labels = useRendererLabels();
  const domId = useBlockDomId();
  const nested = useNestedBlocks(controller, block.id);
  const open = useToggleOpen(controller, block);
  const hidden = open ? 0 : nested.length;
  return (
    <div className="quoin-toggle" data-open={open}>
      <ToggleChevron
        block={block}
        controller={controller}
        label={hidden === 0 ? labels.toggle : labels.toggleButton(hidden)}
        controls={nested.length === 0 ? undefined : nested.map(domId).join(' ')}
      />
      <EditableRegion block={block.id} region="text" label={labels.toggle} />
    </div>
  );
};
