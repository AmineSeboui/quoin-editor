'use client';

import { useLabels } from '../../i18n/use-labels';
import { EditableRegion, type BlockRenderer } from '../../view';
import { useBlockDomId } from '../../view/react/block-dom-id';
import { ToggleChevron } from '../../view/react/ToggleChevron';
import { useToggleOpen } from '../../view/react/use-reader-choices';
import { useNestedBlocks } from './use-nested-blocks';

export const ToggleBlock: BlockRenderer = ({ block, controller }) => {
  const labels = useLabels();
  const domId = useBlockDomId();
  const nested = useNestedBlocks(controller, block.id);
  const open = useToggleOpen(controller, block);
  return (
    <div className="quoin-toggle" data-open={open}>
      <ToggleChevron
        block={block}
        controller={controller}
        label={labels.toggleButton(open ? 0 : nested.length)}
        controls={nested.length === 0 ? undefined : nested.map(domId).join(' ')}
      />
      <EditableRegion block={block.id} region="text" label={labels.toggle} />
    </div>
  );
};
