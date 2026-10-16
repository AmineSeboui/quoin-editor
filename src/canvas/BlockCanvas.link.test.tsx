import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { bookmarkBlock, mountCanvas, paragraph } from '../blocks/void/test-canvas';
import { nodeSelection, textSelection } from '../engine';
import { md } from '../view/react/test-harness';

afterEach(() => history.replaceState(null, '', '/'));

// userEvent puts a clipboard of its own on the navigator, which the copy writes to.
const copied = (text: string) => waitFor(async () => expect(await navigator.clipboard.readText()).toBe(text));

function openMenu(canvas: ReturnType<typeof mountCanvas>, block: string) {
  act(() => canvas.handle().focus({ block, region: 'text', offset: 0 }));
  fireEvent.keyDown(document.activeElement!, { key: '/', ctrlKey: true });
  return screen.getByRole('menu');
}

describe('copying from the block menu', () => {
  it('copies the markdown of the block and its children, and says so', async () => {
    const user = userEvent.setup();
    const canvas = mountCanvas([md('a', '- parent'), md('c', '- **child**', 1), md('z', 'after')]);
    await user.click(within(openMenu(canvas, 'a')).getByRole('menuitem', { name: 'Copy' }));
    await copied('- parent\n  - **child**\n');
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('copies a link to the block on this page by default', async () => {
    const user = userEvent.setup();
    history.replaceState(null, '', '/docs/page?draft=1');
    const canvas = mountCanvas([paragraph('a', 'one'), paragraph('b', 'two')]);
    await user.click(within(openMenu(canvas, 'b')).getByRole('menuitem', { name: 'Copy link to block' }));
    await copied(`${location.origin}/docs/page?draft=1#block-b`);
  });

  it('copies the link the host builds for the block', async () => {
    const user = userEvent.setup();
    const canvas = mountCanvas([paragraph('a', 'one')], { blockLink: (id) => `https://docs.example/p#${id}` });
    await user.click(within(openMenu(canvas, 'a')).getByRole('menuitem', { name: 'Copy link to block' }));
    await copied('https://docs.example/p#a');
  });
});

describe('a link to a block', () => {
  it('selects the linked block on mount, scrolls to it and leaves focus where it was', () => {
    const scrolled = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    history.replaceState(null, '', '#block-b');
    const { selection, shell } = mountCanvas([paragraph('a', 'one'), paragraph('b', 'two')]);
    expect(selection()).toEqual(textSelection({ block: 'b', region: 'text', offset: 0 }));
    expect(scrolled.mock.contexts).toContain(shell('b'));
    expect(document.activeElement).toBe(document.body);
    scrolled.mockRestore();
  });

  it('focuses the linked block on mount when the canvas focuses itself', () => {
    history.replaceState(null, '', '#block-b');
    const { shell } = mountCanvas([paragraph('a', 'one'), paragraph('b', 'two')], { autoFocus: true });
    expect(shell('b').querySelector('[data-quoin-host]')).toHaveFocus();
  });

  it('follows the hash to another block, node-selecting a block without text', () => {
    const { selection, shell } = mountCanvas([paragraph('a', 'one'), bookmarkBlock('bm', 'quoin.dev')]);
    act(() => {
      history.replaceState(null, '', '#block-bm');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(selection()).toEqual(nodeSelection('bm'));
    expect(shell('bm')).toHaveFocus();
  });

  it('ignores a hash naming no block of this canvas', () => {
    const scrolled = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    history.replaceState(null, '', '#block-missing');
    const { selection } = mountCanvas([paragraph('a', 'one'), paragraph('b', 'two')], { autoFocus: true });
    expect(selection()).toEqual(textSelection({ block: 'a', region: 'text', offset: 0 }));
    expect(scrolled).not.toHaveBeenCalled();
    scrolled.mockRestore();
  });
});
