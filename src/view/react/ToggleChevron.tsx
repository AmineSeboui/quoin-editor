import { readerToggles } from '../controller/reader-toggles';
import { flipCommand } from '../input/flip-block';
import { onBlock } from './block-command';
import type { BlockRenderProps } from './block-renderer-types';
import { keepFocus } from './prevent-mouse-focus';
import { useReadOnly } from './use-read-only';
import { useToggleOpen } from './use-reader-choices';

type ToggleChevronProps = Pick<BlockRenderProps, 'block' | 'controller'> & { label?: string; controls?: string };

export function ToggleChevron({ block, controller, label = 'Toggle', controls }: ToggleChevronProps) {
  const open = useToggleOpen(controller, block);
  const readOnly = useReadOnly(controller);
  const flip = flipCommand(block);
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
      className="quoin-toggle-button"
      contentEditable={false}
      tabIndex={readOnly ? 0 : -1}
      onMouseDown={keepFocus}
      onClick={() => {
        if (controller.readOnly) readerToggles(controller).flip(block);
        else if (flip) controller.run(onBlock(block.id, flip));
      }}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M6 3.5l4.5 4.5L6 12.5" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </button>
  );
}
