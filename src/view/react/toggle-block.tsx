import type { BlockRenderer } from './block-renderer-types';
import { EditableRegion } from './EditableRegion';
import { ToggleChevron } from './ToggleChevron';

export const ToggleBlock: BlockRenderer = ({ block, controller }) => (
  <div className="quoin-toggle" data-open={block.attrs.open === true}>
    <ToggleChevron block={block} controller={controller} />
    <EditableRegion block={block.id} region="text" label="Toggle" />
  </div>
);
