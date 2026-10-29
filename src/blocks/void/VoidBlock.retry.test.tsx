import { render, screen } from '@testing-library/react';
import { ListChecks } from 'lucide-react';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import { defineBlock } from '../../registry';
import type { QuoinBlock } from '../../types';
import { paragraph, testBlockTypes } from './test-canvas';

const blocks: QuoinBlock[] = [paragraph('a', 'one'), { id: 'n', type: 'NOTICE', data: { text: 'Hello' } }];

const common = { type: 'NOTICE', label: 'Notice', icon: ListChecks };

const broken = defineBlock<{ text: string }>({
  ...common,
  preview: () => {
    throw new Error('cannot draw');
  },
});

const fixed = defineBlock<{ text: string }>({ ...common, preview: ({ data }) => <p>Notice: {data.text}</p> });

describe('a custom block whose preview threw', () => {
  let logged: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => logged.mockRestore());

  it('is drawn again when the host passes block types with a fixed definition', () => {
    const canvas = (blockTypes = [...testBlockTypes, broken]) => (
      <BlockCanvas blocks={blocks} onChange={() => {}} blockTypes={blockTypes} />
    );
    const { rerender } = render(canvas());
    expect(screen.getByRole('group', { name: 'Block could not be drawn' })).toBeInTheDocument();
    rerender(canvas([...testBlockTypes, fixed]));
    expect(screen.getByText('Notice: Hello')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Block could not be drawn' })).toBeNull();
  });
});
