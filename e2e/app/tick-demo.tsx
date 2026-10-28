import { SquareCheck } from 'lucide-react';
import { defineBlock } from 'quoin-editor';

type TickData = { done: boolean };

export const tickDemo = defineBlock<TickData>({
  type: 'TICK_DEMO',
  label: 'Tick',
  icon: SquareCheck,
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
