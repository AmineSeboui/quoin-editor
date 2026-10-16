import { flipCommand } from '../input/flip-block';
import { onBlock } from './block-command';
import type { BlockRenderProps } from './block-renderer-types';
import { keepFocus } from './prevent-mouse-focus';

type TaskCheckboxProps = Pick<BlockRenderProps, 'block' | 'controller'> & { label?: string };

export function TaskCheckbox({ block, controller, label = 'Task' }: TaskCheckboxProps) {
  const checked = block.attrs.checked === true;
  const flip = flipCommand(block);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className="quoin-task-box"
      contentEditable={false}
      tabIndex={-1}
      onMouseDown={keepFocus}
      onClick={() => {
        if (flip && !controller.readOnly) controller.run(onBlock(block.id, flip));
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
