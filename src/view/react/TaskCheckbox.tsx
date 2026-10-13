import { toggleTask } from '../../engine/commands/block-structure';
import { onBlock } from './block-command';
import type { BlockRenderProps } from './block-renderer-types';
import { keepFocus } from './prevent-mouse-focus';

export function TaskCheckbox({ block, controller }: Pick<BlockRenderProps, 'block' | 'controller'>) {
  const checked = block.attrs.checked === true;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label="Task"
      className="quoin-task-box"
      contentEditable={false}
      tabIndex={-1}
      onMouseDown={keepFocus}
      onClick={() => {
        if (!controller.readOnly) controller.run(onBlock(block.id, toggleTask));
      }}
    >
      {checked ? (
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : null}
    </button>
  );
}
