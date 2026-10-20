import { createRef, useState, type Ref } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { blockRangeSelection, nodeSelection, textSelection, type Selection } from '../engine';
import type { QuoinBlock } from '../types';
import { clipboardEvent, fakeTransfer } from '../view/clipboard/test-transfer';
import { BlockCanvas } from './BlockCanvas';
import type { QuoinEditorHandle } from './canvas-props';

type Removal = { block: QuoinBlock; index: number };

const md = (id: string, markdown: string, indent?: number): QuoinBlock => ({
  id,
  type: 'MARKDOWN',
  data: { markdown },
  ...(indent === undefined ? {} : { indent }),
});
const divider: QuoinBlock = { id: 'd', type: 'DIVIDER', data: {} };
const image: QuoinBlock = { id: 'i', type: 'IMAGE', data: { storageKey: 'cat.png', alt: 'A cat' } };
const closedToggle: QuoinBlock = { id: 't', type: 'TOGGLE', data: { markdown: 'Summary', open: false } };
const at = (block: string, offset: number) => ({ block, region: 'text', offset });
const ids = (blocks: QuoinBlock[]) => blocks.map((block) => block.id).join(',');

type HostProps = { initial: QuoinBlock[]; log: string[]; removals: Removal[]; handle: Ref<QuoinEditorHandle> };

function Host({ initial, log, removals, handle }: HostProps) {
  const [blocks, setBlocks] = useState(initial);
  const [removed, setRemoved] = useState<Removal | null>(null);
  const restore = () => {
    if (removed) setBlocks([...blocks.slice(0, removed.index), removed.block, ...blocks.slice(removed.index)]);
  };
  return (
    <>
      <button type="button" onClick={restore}>
        Restore
      </button>
      <BlockCanvas
        ref={handle}
        blocks={blocks}
        onChange={(next) => {
          log.push(`change ${ids(next)}`);
          setBlocks(next);
        }}
        onDelete={(block, index) => {
          log.push(`delete ${block.id} at ${index}`);
          removals.push({ block, index });
          setRemoved({ block, index });
        }}
      />
    </>
  );
}

function mount(initial: QuoinBlock[]) {
  const log: string[] = [];
  const removals: Removal[] = [];
  const handle = createRef<QuoinEditorHandle>();
  const { container } = render(<Host initial={initial} log={log} removals={removals} handle={handle} />);
  const caret = (block: string) => act(() => handle.current!.focus({ block, region: 'text', offset: 0 }));
  const select = (selection: Selection) =>
    act(() => {
      const { controller } = handle.current!;
      controller.dispatch(controller.editor.createTransaction().setSelection(selection));
    });
  const press = async (key: string) => {
    fireEvent.keyDown(document.activeElement!, { key });
    await act(async () => {});
  };
  const shown = () => Array.from(container.querySelectorAll<HTMLElement>('[data-quoin-block]'), (shell) => shell.dataset.blockId);
  const paste = async (flavours: Record<string, string>) => {
    fireEvent(document.activeElement!, clipboardEvent('paste', fakeTransfer(flavours).transfer));
    await act(async () => {});
  };
  return { log, removals, caret, select, press, paste, shown };
}

describe('BlockCanvas onDelete', () => {
  it('reports a node-selected divider deleted with Backspace, after onChange reported the document without it', async () => {
    const { log, removals, caret, select, press } = mount([md('a', 'above'), divider, md('b', 'below')]);
    caret('a');
    select(nodeSelection('d'));
    await press('Backspace');
    expect(log).toEqual(['change a,b', 'delete d at 1']);
    expect(removals).toEqual([{ block: divider, index: 1 }]);
  });

  it('shows the block again when the host splices it back on a later interaction', async () => {
    const { caret, select, press, shown } = mount([md('a', 'above'), divider, md('b', 'below')]);
    caret('a');
    select(nodeSelection('d'));
    await press('Backspace');
    expect(shown()).toEqual(['a', 'b']);
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(shown()).toEqual(['a', 'd', 'b']);
  });

  it('reports every block of a deleted block range with the index it held', async () => {
    const { removals, caret, select, press } = mount([md('a', 'one'), md('b', 'two'), md('c', 'three')]);
    caret('a');
    select(blockRangeSelection('b', 'c'));
    await press('Backspace');
    expect(removals).toEqual([
      { block: md('b', 'two'), index: 1 },
      { block: md('c', 'three'), index: 2 },
    ]);
  });

  it('reports a divider inside a text range deleted with Backspace, after onChange', async () => {
    const { log, removals, caret, select, press } = mount([md('a', 'one'), divider, md('b', 'two')]);
    caret('a');
    select(textSelection(at('a', 1), at('b', 1)));
    await press('Backspace');
    expect(log).toEqual(['change a', 'delete d at 1']);
    expect(removals).toEqual([{ block: divider, index: 1 }]);
  });

  it('reports an image inside a text range deleted with Delete, after onChange', async () => {
    const { log, removals, caret, select, press } = mount([md('a', 'one'), image, md('b', 'two')]);
    caret('a');
    select(textSelection(at('a', 3), at('b', 0)));
    await press('Delete');
    expect(log).toEqual(['change a', 'delete i at 1']);
    expect(removals).toEqual([{ block: image, index: 1 }]);
  });

  it('counts a 0.4 markdown block it split into paragraphs as the one block the host holds', async () => {
    const legacy = md('m', 'first\n\nsecond');
    const { log, caret, select, press } = mount([legacy, divider, md('b', 'below')]);
    caret('m');
    select(nodeSelection('d'));
    await press('Backspace');
    expect(log).toEqual(['change m,b', 'delete d at 1']);
  });

  it('does not report the paragraph a Backspace merges into the one above', async () => {
    const { log, caret, press } = mount([md('a', 'one'), md('b', 'two')]);
    caret('b');
    await press('Backspace');
    expect(log).toEqual(['change a']);
  });

  it('does not report the empty line Backspace drops after a divider', async () => {
    const { log, caret, press } = mount([md('a', 'one'), divider, md('e', '')]);
    caret('e');
    await press('Backspace');
    expect(log).toEqual(['change a,d']);
  });

  it.each([
    ['a line', 'line'],
    ['an empty line', ''],
  ])('does not report %s that Backspace joins into a closed toggle', async (_case, text) => {
    const { log, caret, press } = mount([closedToggle, md('c', 'hidden', 1), md('s', text)]);
    caret('s');
    await press('Backspace');
    expect(log).toEqual(['change t,c']);
  });

  it('reports a node-selected divider that a typed key replaces with a paragraph', async () => {
    const { log, removals, caret, select, press } = mount([md('a', 'above'), divider, md('b', 'below')]);
    caret('a');
    select(nodeSelection('d'));
    await press('x');
    expect(log.at(-1)).toBe('delete d at 1');
    expect(removals).toEqual([{ block: divider, index: 1 }]);
  });

  it('reports every block of a block range that a paste replaces', async () => {
    const { removals, caret, select, paste } = mount([md('a', 'one'), md('b', 'two'), image, md('c', 'three')]);
    caret('a');
    select(blockRangeSelection('b', 'i'));
    await paste({ 'text/plain': 'pasted' });
    expect(removals).toEqual([
      { block: md('b', 'two'), index: 1 },
      { block: image, index: 2 },
    ]);
  });

  it('does not report the empty line that pasted blocks take the place of', async () => {
    const { log, caret, paste } = mount([md('a', 'one'), md('e', '')]);
    caret('e');
    await paste({ 'text/html': '<h2>Pasted</h2><p>blocks</p>', 'text/plain': 'Pasted\n\nblocks' });
    const changes = log.filter((entry) => entry.startsWith('change '));
    const ids = changes.at(-1)!.slice('change '.length).split(',');
    expect(ids).toHaveLength(3);
    expect(ids).not.toContain('e');
    expect(log.filter((entry) => entry.startsWith('delete'))).toEqual([]);
  });

  it.each([
    ['all the text of a line', at('b', 0), at('b', 16)],
    ['text from the start of a line to the end of the next', at('b', 0), at('c', 17)],
  ])('does not report the line that blocks pasted over %s take the place of', async (_case, anchor, head) => {
    const blocks = [md('a', '# Title'), md('b', 'First paragraph.'), md('c', 'Second paragraph.')];
    const { log, caret, select, paste } = mount(blocks);
    caret('a');
    select(textSelection(anchor, head));
    await paste({ 'text/html': '<p>One</p><p>Two</p>', 'text/plain': 'One\n\nTwo' });
    expect(log.some((entry) => entry.startsWith('change'))).toBe(true);
    expect(log.filter((entry) => entry.startsWith('delete'))).toEqual([]);
  });
});
