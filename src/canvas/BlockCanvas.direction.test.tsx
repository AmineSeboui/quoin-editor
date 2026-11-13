import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mountCanvas, paragraph } from '../blocks/test-support/test-canvas';

const hostOf = (shell: HTMLElement) => shell.querySelector<HTMLElement>('[data-quoin-host]')!;

async function openBlockMenu(afterMount = () => {}) {
  const user = userEvent.setup();
  const { shell } = mountCanvas([paragraph('a', 'intro')]);
  await act(async () => afterMount());
  fireEvent.pointerMove(hostOf(shell('a')));
  await user.click(screen.getByRole('button', { name: 'Drag to move, click for options' }));
  return screen.getByRole('menu');
}

afterEach(() => {
  document.documentElement.removeAttribute('dir');
  document.documentElement.style.removeProperty('direction');
});

// The menus ask to be placed at the inline start or end rather than at a side, and whoever places them reads the
// direction through React rather than from the DOM, since they are drawn in a portal outside the canvas. A canvas that
// never says which way its page runs therefore has every one of them placed against a left to right default.
describe('the direction a canvas reports to its menus', () => {
  it('is right to left for a canvas on a right to left page', async () => {
    document.documentElement.setAttribute('dir', 'rtl');
    expect(await openBlockMenu()).toHaveAttribute('dir', 'rtl');
  });

  it('is right to left for a canvas the page turns round with CSS alone, carrying no dir attribute', async () => {
    document.documentElement.style.direction = 'rtl';
    expect(await openBlockMenu()).toHaveAttribute('dir', 'rtl');
  });

  it('follows a page that turns round while the canvas is mounted', async () => {
    expect(await openBlockMenu(() => document.documentElement.setAttribute('dir', 'rtl'))).toHaveAttribute('dir', 'rtl');
  });

  it('is left to right for a canvas on an ordinary page', async () => {
    expect(await openBlockMenu()).toHaveAttribute('dir', 'ltr');
  });
});
