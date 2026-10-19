import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { blockRangeSelection, textSelection } from '../engine';
import { defineBlock } from '../registry';
import { bookmarkBlock, mountCanvas, paragraph, testBlockTypes } from '../blocks/void/test-canvas';
import { md } from '../view/react/test-harness';

const hostOf = (shell: HTMLElement) => shell.querySelector<HTMLElement>('[data-quoin-host]')!;
const handleButton = () => screen.getByRole('button', { name: 'Drag to move, click for options' });
const addButton = () => screen.getByRole('button', { name: 'Add block below' });

describe('the gutter', () => {
  it('opens the block menu of the block under the pointer from its handle', async () => {
    const user = userEvent.setup();
    const { shell } = mountCanvas([paragraph('a', 'intro'), paragraph('b', '## Title')]);
    fireEvent.pointerMove(hostOf(shell('b')));
    await user.click(handleButton());
    expect(screen.getByRole('menu')).toHaveAccessibleName('Heading 2 block menu');
  });

  it('closes its open block menu from the handle without opening it again', async () => {
    const user = userEvent.setup();
    const { handle, shell } = mountCanvas([paragraph('a', 'intro')]);
    act(() => handle().focus({ block: 'a', region: 'text', offset: 2 }));
    await user.click(handleButton());
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.pointer({ keys: '[MouseLeft>]', target: handleButton() });
    await waitFor(() => expect(hostOf(shell('a'))).toHaveFocus());
    await user.pointer({ keys: '[/MouseLeft]', target: handleButton() });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens the menu on a click with no press of its own after a press on the handle that ended without one', async () => {
    const user = userEvent.setup();
    const { handle, shell } = mountCanvas([paragraph('a', 'intro')]);
    act(() => handle().focus({ block: 'a', region: 'text', offset: 2 }));
    await user.click(handleButton());
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.pointerDown(handleButton(), { button: 0 });
    fireEvent.pointerCancel(handleButton());
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(hostOf(shell('a'))).toHaveFocus());
    fireEvent.click(handleButton());
    expect(screen.getByRole('menu')).toHaveAccessibleName('Text block menu');
  });

  it('keeps its controls out of the tab order', () => {
    const { shell } = mountCanvas([paragraph('a', 'intro')]);
    fireEvent.pointerMove(hostOf(shell('a')));
    expect(addButton()).toHaveAttribute('tabindex', '-1');
    expect(handleButton()).toHaveAttribute('tabindex', '-1');
  });

  it('adds a paragraph after the block and its children, and opens the slash menu in it', async () => {
    const user = userEvent.setup();
    const { changes, last, selection, shell } = mountCanvas([md('a', '- parent'), md('c', '- child', 1), md('z', 'after')]);
    fireEvent.pointerMove(hostOf(shell('a')));
    await user.click(addButton());
    expect(changes).toHaveLength(1);
    const added = last()[2];
    expect(last().map((block) => block.id)).toEqual(['a', 'c', added.id, 'z']);
    expect(added).toMatchObject({ type: 'MARKDOWN', data: { markdown: '/' } });
    expect(added.indent ?? 0).toBe(0);
    expect(selection()).toEqual(textSelection({ block: added.id, region: 'text', offset: 1 }));
    expect(hostOf(shell(added.id))).toHaveFocus();
    expect(screen.getByRole('listbox', { name: 'Commands' })).toBeInTheDocument();
  });

  it('opens the slash menu in an empty paragraph rather than adding another below it', async () => {
    const user = userEvent.setup();
    const { last, selection, shell } = mountCanvas([paragraph('a', 'intro'), paragraph('e', '')]);
    fireEvent.pointerMove(hostOf(shell('e')));
    await user.click(addButton());
    expect(last().map((block) => block.data.markdown)).toEqual(['intro', '/']);
    expect(selection()).toEqual(textSelection({ block: 'e', region: 'text', offset: 1 }));
    expect(screen.getByRole('listbox', { name: 'Commands' })).toBeInTheDocument();
  });

  it('does not draw the blocks again while the pointer moves across them', () => {
    let drawn = 0;
    const counted = defineBlock<{ n: number }>({
      type: 'COUNTED',
      label: 'Counted',
      icon: () => null,
      preview: () => {
        drawn += 1;
        return <p>counted</p>;
      },
    });
    const doc = [paragraph('a', 'one'), { id: 'k', type: 'COUNTED', data: { n: 1 } }, paragraph('b', 'two')];
    const { shell } = mountCanvas(doc, { blockTypes: [...testBlockTypes, counted] });
    const before = drawn;
    for (const id of ['a', 'k', 'b', 'a', 'k']) fireEvent.pointerMove(shell(id));
    expect(drawn).toBe(before);
  });

  it('is not drawn while read-only', () => {
    const { shell } = mountCanvas([paragraph('a', 'intro')], { readOnly: true });
    fireEvent.pointerMove(shell('a'));
    expect(screen.queryByRole('button', { name: 'Add block below' })).toBeNull();
  });
});

describe('the block context menu', () => {
  it('opens at the pointer on a void block', async () => {
    const { shell } = mountCanvas([paragraph('a', 'intro'), bookmarkBlock('bm', 'quoin.dev')]);
    const opened = !fireEvent.contextMenu(shell('bm'), { clientX: 40, clientY: 50 });
    expect(opened).toBe(true);
    const menu = await screen.findByRole('menu');
    expect(menu).toHaveAccessibleName('Bookmark block menu');
    expect(within(menu).getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument();
  });

  it('opens on the handle', async () => {
    const { shell } = mountCanvas([paragraph('a', 'intro')]);
    fireEvent.pointerMove(hostOf(shell('a')));
    expect(fireEvent.contextMenu(handleButton())).toBe(false);
    expect(await screen.findByRole('menu')).toHaveAccessibleName('Text block menu');
  });

  it('leaves a right-click in text to the browser, for its spelling suggestions', () => {
    const { shell } = mountCanvas([paragraph('a', 'intro')]);
    expect(fireEvent.contextMenu(hostOf(shell('a')))).toBe(true);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('acts on the selected blocks wherever the right-click lands while blocks are selected', async () => {
    const user = userEvent.setup();
    const { handle, last, shell } = mountCanvas([paragraph('a', 'one'), paragraph('b', 'two'), paragraph('c', 'three')]);
    act(() => {
      const { controller } = handle();
      controller.dispatch(controller.editor.createTransaction().setSelection(blockRangeSelection('a', 'b')));
      controller.focus();
    });
    expect(fireEvent.contextMenu(hostOf(shell('b')))).toBe(false);
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    expect(last().map((block) => block.id)).toEqual(['c']);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });
});
