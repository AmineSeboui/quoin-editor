import * as React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlockCanvas } from './BlockCanvas';
import type * as BlockListModule from '../hooks/useBlockList';
import type { QuoinBlock } from '../types';

const { resetSpy } = vi.hoisted(() => ({ resetSpy: vi.fn() }));

// The canvas resets itself only for a document it did not write, so the spy sits on
// `reset` to tell a tolerated echo apart from the canvas treating its own output as foreign.
vi.mock('../hooks/useBlockList', async (importOriginal) => {
  const actual = await importOriginal<typeof BlockListModule>();
  const React = await import('react');
  return {
    ...actual,
    useBlockList: (initial: QuoinBlock[]) => {
      const list = actual.useBlockList(initial);
      const reset = React.useCallback(
        (blocks: QuoinBlock[]) => {
          resetSpy(blocks);
          list.reset(blocks);
        },
        [list.reset],
      );
      return { ...list, reset };
    },
  };
});

const seed: QuoinBlock[] = [{ id: 'a', type: 'MARKDOWN', data: { markdown: '' } }];
const TYPED = 'ZZTYPED hello world';

function LaggingHost() {
  const [blocks, setBlocks] = React.useState<QuoinBlock[]>(seed);
  return <BlockCanvas blocks={blocks} onChange={(next) => setTimeout(() => setBlocks(next), 0)} />;
}

function SyncHost() {
  const [blocks, setBlocks] = React.useState<QuoinBlock[]>(seed);
  return <BlockCanvas blocks={blocks} onChange={setBlocks} />;
}

// Hands each emission back once `lag` newer ones have been emitted, optionally as a copy,
// and lets the test release the rest or supply a document of its own.
function delayedHost(lag: number, copy: (blocks: QuoinBlock[]) => QuoinBlock[] = (blocks) => blocks) {
  const pending: QuoinBlock[][] = [];
  let supply: (blocks: QuoinBlock[]) => void = () => {};
  const echoOldest = () => {
    const oldest = pending.shift();
    if (oldest) supply(copy(oldest));
  };
  function Host() {
    const [blocks, setBlocks] = React.useState<QuoinBlock[]>(seed);
    supply = setBlocks;
    return (
      <BlockCanvas
        blocks={blocks}
        onChange={(next) => {
          pending.push(next);
          if (pending.length > lag) echoOldest();
        }}
      />
    );
  }
  return {
    Host,
    pending,
    echoOldest: () => act(echoOldest),
    supply: (blocks: QuoinBlock[]) => act(() => supply(blocks)),
  };
}

// A delay between keystrokes yields the event loop, which is what lets a host echoing
// through a timer land its stale documents in the middle of the burst.
async function typeInto(ui: React.ReactElement, text = TYPED) {
  const user = userEvent.setup({ delay: 1 });
  render(ui);
  await user.click(screen.getByText('Empty markdown block'));
  const box = await screen.findByLabelText('Markdown');
  await user.type(box, text);
  return box;
}

beforeEach(() => resetSpy.mockClear());

describe('a host that echoes the canvas back late', () => {
  it('keeps every character typed while its echoes are still in flight', async () => {
    const box = await typeInto(<LaggingHost />);

    await waitFor(() => expect(box).toHaveValue(TYPED));
  });

  it('never treats one of its own documents as a foreign one', async () => {
    await typeInto(<LaggingHost />);

    await waitFor(() => expect(resetSpy).not.toHaveBeenCalled());
  });
});

describe('a host that falls far behind', () => {
  it('keeps every character when every echo arrives 200 emissions late', async () => {
    const text = 'x'.repeat(200);
    const host = delayedHost(200);
    const box = await typeInto(<host.Host />, text);
    expect(host.pending).toHaveLength(200);

    while (host.pending.length > 0) {
      host.echoOldest();
      expect(box).toHaveValue(text);
    }
    expect(resetSpy).not.toHaveBeenCalled();
  });

  it('keeps every character when its echoes land while more than 64 emissions are outstanding', async () => {
    const text = 'y'.repeat(120);
    const host = delayedHost(80);
    const box = await typeInto(<host.Host />, text);
    expect(host.pending).toHaveLength(80);
    expect(box).toHaveValue(text);

    while (host.pending.length > 0) host.echoOldest();

    expect(box).toHaveValue(text);
    expect(resetSpy).not.toHaveBeenCalled();
  });
});

describe('a host that does not echo the canvas back', () => {
  it('replaces the document with a copy of a state more than 64 edits old', async () => {
    const host = delayedHost(Number.POSITIVE_INFINITY);
    const box = await typeInto(<host.Host />, 'z'.repeat(70));

    host.supply(structuredClone(host.pending[0]));

    expect(box).toHaveValue('z');
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });
});

describe('a host that echoes structural copies of the canvas', () => {
  it('keeps every character when the copies arrive five emissions late', async () => {
    const host = delayedHost(5, structuredClone);
    const box = await typeInto(<host.Host />);

    while (host.pending.length > 0) host.echoOldest();

    expect(box).toHaveValue(TYPED);
    expect(resetSpy).not.toHaveBeenCalled();
  });

  it('matches a copy to the oldest emission it equals when the text repeats itself', async () => {
    const host = delayedHost(3, structuredClone);
    const box = await typeInto(<host.Host />, 'abc{Backspace}d');

    while (host.pending.length > 0) host.echoOldest();

    expect(box).toHaveValue('abd');
    expect(resetSpy).not.toHaveBeenCalled();
  });

  it('still replaces the document with one that matches none of its emissions', async () => {
    const host = delayedHost(5, structuredClone);
    await typeInto(<host.Host />, 'abc');

    host.supply([{ id: 'x', type: 'MARKDOWN', data: { markdown: 'loaded' } }]);

    expect(await screen.findByText('loaded')).toBeInTheDocument();
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });
});

describe('a host that echoes the canvas back synchronously', () => {
  it('types a burst through without a single reset', async () => {
    const box = await typeInto(<SyncHost />);

    expect(box).toHaveValue(TYPED);
    expect(resetSpy).not.toHaveBeenCalled();
  });
});

describe('a host that supplies a document of its own', () => {
  it('still resets for an array the canvas emitted earlier and the host replays', async () => {
    const user = userEvent.setup();
    function UndoHost() {
      const [blocks, setBlocks] = React.useState<QuoinBlock[]>(seed);
      const history = React.useRef<QuoinBlock[][]>([]);
      return (
        <>
          <button onClick={() => setBlocks(history.current[0])}>undo</button>
          <BlockCanvas
            blocks={blocks}
            onChange={(next) => {
              history.current.push(next);
              setBlocks(next);
            }}
          />
        </>
      );
    }
    render(<UndoHost />);
    await user.click(screen.getByText('Empty markdown block'));
    await user.type(await screen.findByLabelText('Markdown'), 'ab');
    expect(screen.getByLabelText('Markdown')).toHaveValue('ab');

    // Clicking outside the block also leaves edit mode, so the undone document is read
    // from the preview rather than from the box.
    await user.click(screen.getByRole('button', { name: 'undo' }));

    expect(await screen.findByText('a')).toBeInTheDocument();
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it('resets for an emission older than one the host already handed back', async () => {
    const host = delayedHost(Number.POSITIVE_INFINITY);
    const box = await typeInto(<host.Host />, 'abc');
    const [first, , third] = host.pending;

    host.supply(third);
    expect(resetSpy).not.toHaveBeenCalled();

    host.supply(first);
    expect(box).toHaveValue('a');
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it('resets for a document it never emitted', async () => {
    const user = userEvent.setup();
    function LoadingHost() {
      const [blocks, setBlocks] = React.useState<QuoinBlock[]>(seed);
      return (
        <>
          <button onClick={() => setBlocks([{ id: 'x', type: 'MARKDOWN', data: { markdown: 'loaded' } }])}>
            load
          </button>
          <BlockCanvas blocks={blocks} onChange={setBlocks} />
        </>
      );
    }
    render(<LoadingHost />);

    await user.click(screen.getByRole('button', { name: 'load' }));

    expect(await screen.findByText('loaded')).toBeInTheDocument();
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });
});
