import { defineBlock } from 'quoin-editor';
import { ListTodo } from '../../src/icons';

type TickData = { done: boolean };

export const tickDemo = defineBlock<TickData>({
  type: 'TICK_DEMO',
  label: 'Tick',
  icon: ListTodo,
  inSlashPalette: false,
  preview: ({ data, onChange }) => (
    <input
      type="checkbox"
      aria-label="Done"
      checked={data.done}
      disabled={onChange === undefined}
      onChange={() => onChange?.({ done: !data.done })}
    />
  ),
  initialData: () => ({ done: false }),
});
