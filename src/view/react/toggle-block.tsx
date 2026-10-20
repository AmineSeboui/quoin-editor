import type { BlockRenderer } from './block-renderer-types';
import { EditableRegion } from './EditableRegion';
import { ToggleChevron } from './ToggleChevron';
import { useToggleOpen } from './use-reader-choices';

export const ToggleBlock: BlockRenderer = ({ block, controller }) => {
  const open = useToggleOpen(controller, block);
  return (
    <div className="quoin-toggle" data-open={open}>
      <ToggleChevron block={block} controller={controller} />
      <EditableRegion block={block.id} region="text" label="Toggle" />
    </div>
  );
};
