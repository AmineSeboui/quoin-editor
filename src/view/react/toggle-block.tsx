import { setAttrs } from '../../engine/commands/block-style';
import { onBlock } from './block-command';
import type { BlockRenderer } from './block-renderer-types';
import { EditableRegion } from './EditableRegion';
import { keepFocus } from './prevent-mouse-focus';

export const ToggleBlock: BlockRenderer = ({ block, controller }) => {
  const open = block.attrs.open === true;
  return (
    <div className="quoin-toggle" data-open={open}>
      <button
        type="button"
        aria-expanded={open}
        aria-label="Toggle"
        className="quoin-toggle-button"
        contentEditable={false}
        tabIndex={-1}
        onMouseDown={keepFocus}
        onClick={() => controller.run(onBlock(block.id, setAttrs({ open: !open })))}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M6 3.5l4.5 4.5L6 12.5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      <EditableRegion block={block.id} region="text" label="Toggle" />
    </div>
  );
};
