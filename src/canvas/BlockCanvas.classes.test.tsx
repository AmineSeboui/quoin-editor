import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CALLOUT_TONES } from '../blocks/text/callout-tone';
import { bookmarkBlock, mountCanvas, paragraph } from '../blocks/void/test-canvas';
import type { QuoinBlock } from '../types';
import { classLists, classSet } from '../ui/test-class-lists';

const HOST = 'host-class';

const callout = (tone: string): QuoinBlock => ({ id: tone, type: 'CALLOUT', data: { tone, body: tone } });
const heading = (level: number) => paragraph(`h${level}`, `${'#'.repeat(level)} Heading`);

const DOCUMENT: QuoinBlock[] = [
  paragraph('p', 'plain text'),
  ...[1, 2, 3, 4, 5, 6].map(heading),
  ...CALLOUT_TONES.map(callout),
  { id: 'k', type: 'CODE', data: { language: 'ts', code: 'x' } },
  bookmarkBlock('b', 'quoin.dev'),
  { id: 'i', type: 'IMAGE', data: { storageKey: 'photo', alt: 'A photo' } },
  { id: 'e', type: 'IMAGE', data: { storageKey: '', alt: '' } },
];

const mount = (props = {}) => mountCanvas(DOCUMENT, { upload: vi.fn(), ...props });
const hostOf = (canvas: ReturnType<typeof mount>, id: string) =>
  canvas.shell(id).querySelector<HTMLElement>('[data-quoin-host]')!;
const gutter = () => screen.getByRole('button', { name: 'Add block below' }).parentElement!;
const menus = () => screen.getAllByRole('menu');

function openBlockMenu(canvas: ReturnType<typeof mount>, block: string, region = 'text') {
  act(() => canvas.handle().focus({ block, region, offset: 0 }));
  fireEvent.keyDown(document.activeElement!, { key: '/', ctrlKey: true });
}

describe('the classes Quoin gives its own canvas', () => {
  it('at rest, with a class the host adds to the canvas', () => {
    const { container } = mount({ className: HOST });
    expect([`gutter: ${classSet(gutter())}`, ...classLists(container)]).toMatchSnapshot();
  });

  it('with the gutter shown beside a block', () => {
    const canvas = mount();
    fireEvent.pointerMove(hostOf(canvas, 'p'));
    expect(classSet(gutter())).toMatchSnapshot();
  });

  it('in the block menu of a callout and its submenus', async () => {
    const user = userEvent.setup();
    const canvas = mount();
    openBlockMenu(canvas, 'info', 'body');
    const lists = [classLists(...menus())];
    for (const submenu of ['Tone', 'Icon', 'Turn into']) {
      await user.click(screen.getByRole('menuitem', { name: submenu }));
      lists.push(classLists(...menus()));
    }
    expect(lists).toMatchSnapshot();
  });

  it('in the block menu of a paragraph and its color submenu', async () => {
    const user = userEvent.setup();
    const canvas = mount();
    openBlockMenu(canvas, 'p');
    await user.click(screen.getByRole('menuitem', { name: 'Color' }));
    expect(classLists(...menus())).toMatchSnapshot();
  });

  it('in the context menu of a block', async () => {
    const canvas = mount();
    fireEvent.contextMenu(canvas.shell('b'), { clientX: 40, clientY: 50 });
    expect(classLists(await screen.findByRole('menu'))).toMatchSnapshot();
  });

  it('in the menus of a callout chip', async () => {
    const user = userEvent.setup();
    mount();
    const lists: string[][] = [];
    for (const chip of ['Callout icon', 'Callout tone: info']) {
      await user.click(screen.getAllByRole('button', { name: chip })[0]);
      lists.push(classLists(...menus()));
      await user.keyboard('{Escape}');
    }
    expect(lists).toMatchSnapshot();
  });

  it('in a selected image block and its toolbar, and in an image block with no picture', async () => {
    const user = userEvent.setup();
    const canvas = mount();
    canvas.nodeSelect('i');
    const toolbar = screen.getByRole('toolbar', { name: 'Image tools' });
    const lists = [classLists(canvas.shell('i'), toolbar)];
    await user.click(screen.getByRole('button', { name: 'Alt text' }));
    lists.push(classLists(screen.getByRole('dialog', { name: 'Alt text' })));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Embed link' }));
    lists.push(classLists(canvas.shell('e')));
    expect(lists).toMatchSnapshot();
  });

  it('in the keyboard shortcuts dialog', () => {
    const canvas = mount();
    act(() => canvas.handle().focus({ block: 'p', region: 'text', offset: 0 }));
    fireEvent.keyDown(document.activeElement!, { key: '/', ctrlKey: true, shiftKey: true });
    expect(classLists(screen.getByRole('dialog', { name: 'Keyboard shortcuts' }))).toMatchSnapshot();
  });
});
