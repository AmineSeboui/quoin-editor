import { createRef, useRef, useState, type Ref } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { nodeSelection } from '../engine';
import type { QuoinBlock } from '../types';
import { BlockCanvas } from './BlockCanvas';
import type { QuoinEditorHandle } from './canvas-props';

type Removal = { block: QuoinBlock; index: number };

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });
const divider: QuoinBlock = { id: 'd', type: 'DIVIDER', data: {} };
const initial = [md('a', 'above'), divider, md('b', 'below')];
const DEBOUNCE = 300;

const spliced = (blocks: QuoinBlock[], { block, index }: Removal) => [
  ...blocks.slice(0, index),
  block,
  ...blocks.slice(index),
];

function SyncHost({ handle }: { handle: Ref<QuoinEditorHandle> }) {
  const [blocks, setBlocks] = useState(initial);
  return (
    <BlockCanvas
      ref={handle}
      blocks={blocks}
      onChange={setBlocks}
      onDelete={(block, index) => setBlocks((current) => spliced(current, { block, index }))}
    />
  );
}

function DebouncedHost({ handle }: { handle: Ref<QuoinEditorHandle> }) {
  const [blocks, setBlocks] = useState(initial);
  const [removed, setRemoved] = useState<Removal | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onChange = (next: QuoinBlock[]) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setBlocks(next), DEBOUNCE);
  };
  return (
    <>
      <button type="button" onClick={() => removed && setBlocks(spliced(blocks, removed))}>
        Undo delete
      </button>
      <BlockCanvas
        ref={handle}
        blocks={blocks}
        onChange={onChange}
        onDelete={(block, index) => setRemoved({ block, index })}
      />
    </>
  );
}

async function deleteDivider(handle: { current: QuoinEditorHandle | null }) {
  act(() => {
    const { controller } = handle.current!;
    controller.dispatch(controller.editor.createTransaction().setSelection(nodeSelection('d')));
    handle.current!.focus();
  });
  fireEvent.keyDown(document.activeElement!, { key: 'Backspace' });
  await act(async () => {});
}

afterEach(() => vi.useRealTimers());

describe('a block restored after onDelete', () => {
  it('comes back once when a host that applies onChange at once splices it back inside onDelete', async () => {
    const handle = createRef<QuoinEditorHandle>();
    render(<SyncHost handle={handle} />);
    await deleteDivider(handle);
    expect(handle.current!.editor.getBlocks()).toEqual(initial);
  });

  it('comes back once when a debounced host splices it back on a later interaction', async () => {
    vi.useFakeTimers();
    const handle = createRef<QuoinEditorHandle>();
    render(<DebouncedHost handle={handle} />);
    await deleteDivider(handle);
    await act(async () => void vi.advanceTimersByTime(DEBOUNCE));
    expect(handle.current!.editor.getBlocks()).toEqual([initial[0], initial[2]]);
    fireEvent.click(screen.getByRole('button', { name: 'Undo delete' }));
    expect(handle.current!.editor.getBlocks()).toEqual(initial);
  });
});
