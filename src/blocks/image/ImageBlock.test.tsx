import { act, fireEvent, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { nodeSelection, textSelection } from '../../engine';
import type { QuoinBlock } from '../../types';
import { mountCanvas, paragraph } from '../void/test-canvas';

const resolveAssetUrl = (key: string) => `/cdn/${key}`;
const image = (data: Record<string, unknown> = {}): QuoinBlock => ({
  id: 'i',
  type: 'IMAGE',
  data: { storageKey: 'cat.png', alt: 'A cat', ...data },
});
const caption = () => screen.getByRole('textbox', { name: 'Image caption' });

function type(text: string): void {
  for (const data of text) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, event);
  }
}

describe('the image block', () => {
  it('draws the picture the host resolves its key to, named by its alt text, in a group named after the block', () => {
    mountCanvas([image()], { resolveAssetUrl });
    const group = screen.getByRole('group', { name: 'Image' });
    expect(within(group).getByRole('img', { name: 'A cat' })).toHaveAttribute('src', '/cdn/cat.png');
    expect(within(group).queryByRole('button', { name: /^Edit/ })).toBeNull();
  });

  it('draws a linked picture from its address, and names a picture with no alt text as such', () => {
    mountCanvas([image({ storageKey: '', alt: '', url: 'https://quoin.dev/cat.png' })], { resolveAssetUrl });
    expect(screen.getByRole('img', { name: 'Image, no description' })).toHaveAttribute('src', 'https://quoin.dev/cat.png');
  });

  it('keeps the measured size on the picture and its width as a share of the block', () => {
    const { container } = mountCanvas([image({ width: 40, height: 30, widthPercent: 50 })], { resolveAssetUrl });
    const picture = screen.getByRole('img', { name: 'A cat' });
    expect(picture).toHaveAttribute('width', '40');
    expect(picture).toHaveAttribute('height', '30');
    expect(container.querySelector('.quoin-image-frame')).toHaveStyle({ width: '50%' });
  });

  it('writes what is typed into its caption to data.caption, as inline markdown that keeps its marks', () => {
    const { handle, last } = mountCanvas([image()], { resolveAssetUrl });
    act(() => handle().focus({ block: 'i', region: 'caption', offset: 0 }));
    type('A *cat*');
    expect(last()[0].data).toEqual({ storageKey: 'cat.png', alt: 'A cat', caption: 'A _cat_' });
    expect(caption()).toHaveTextContent('A cat');
    expect(caption().querySelector('em')).toHaveTextContent('cat');
  });

  it('offers to add a caption, and draws a caption the block has', () => {
    mountCanvas([image({ caption: 'Sleepy' }), { ...image(), id: 'j' }], { resolveAssetUrl });
    const [captioned, uncaptioned] = screen.getAllByRole('textbox', { name: 'Image caption' });
    expect(captioned).toHaveTextContent('Sleepy');
    expect(uncaptioned).toHaveAttribute('data-placeholder', 'Add a caption');
  });

  it('puts the caret at the end of its caption on Enter, and a key typed on the selected block into the caption', () => {
    const { nodeSelect, press, selection, last } = mountCanvas([paragraph('a', 'above'), image({ caption: 'Cat' })], {
      resolveAssetUrl,
    });
    nodeSelect('i');
    press('Enter');
    expect(selection()).toEqual(textSelection({ block: 'i', region: 'caption', offset: 3 }));
    expect(caption()).toHaveFocus();
    nodeSelect('i');
    press('s');
    expect(last()[1].data).toMatchObject({ storageKey: 'cat.png', caption: 'Cats' });
    expect(selection()).toEqual(textSelection({ block: 'i', region: 'caption', offset: 4 }));
  });

  it('leaves its caption for a new line under it on Enter', () => {
    const { handle, press, last, selection } = mountCanvas([image({ caption: 'Cat' })], { resolveAssetUrl });
    act(() => handle().focus({ block: 'i', region: 'caption', offset: 3 }));
    press('Enter');
    expect(last().map((block) => block.type)).toEqual(['IMAGE', 'MARKDOWN']);
    expect(selection()).toEqual(textSelection({ block: last()[1].id, region: 'text', offset: 0 }));
  });

  it('leaves Enter to a menu open in its caption, which takes the query out of the caption', () => {
    const { handle, last } = mountCanvas([image({ caption: 'Cat' })], { resolveAssetUrl });
    act(() => handle().focus({ block: 'i', region: 'caption', offset: 3 }));
    type(' /divider');
    expect(screen.getByRole('listbox', { name: 'Commands' })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    expect(last().map((block) => block.type)).toEqual(['IMAGE', 'DIVIDER', 'MARKDOWN']);
    expect(last()[0].data).toEqual({ storageKey: 'cat.png', alt: 'A cat', caption: 'Cat' });
  });

  it('is selected as a whole by the arrows and by a click on its picture', () => {
    const { handle, press, selection, sink } = mountCanvas([paragraph('a', 'above'), image(), paragraph('b', 'below')], {
      resolveAssetUrl,
    });
    act(() => handle().focus({ block: 'a', region: 'text', offset: 5 }));
    press('ArrowRight');
    expect(selection()).toEqual(nodeSelection('i'));
    act(() => handle().focus({ block: 'b', region: 'text', offset: 0 }));
    fireEvent.click(screen.getByRole('img', { name: 'A cat' }));
    expect(selection()).toEqual(nodeSelection('i'));
    expect(sink()).toHaveFocus();
  });

  it('draws a picture the host cannot resolve as missing, with its alt text, and goes on drawing the canvas', () => {
    const resolveAssetUrl = () => {
      throw new Error('no such key');
    };
    mountCanvas([paragraph('a', 'above'), image()], { resolveAssetUrl });
    expect(screen.getByRole('img', { name: 'A cat' })).toHaveTextContent('A cat');
    expect(screen.getByRole('textbox', { name: 'Paragraph' })).toHaveTextContent('above');
  });

  it('draws neither handles nor an empty caption on a read-only canvas, and says an empty block has no image', () => {
    mountCanvas([image(), image({ storageKey: '' })].map((block, n) => ({ ...block, id: `i${n}` })), {
      resolveAssetUrl,
      readOnly: true,
    });
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'Image caption' })).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('No image chosen')).toBeInTheDocument();
  });

  it('has no accessibility violations, with a picture and without one', async () => {
    const { container } = mountCanvas([image({ caption: 'Cat' }), { id: 'e', type: 'IMAGE', data: { storageKey: '', alt: '' } }], {
      resolveAssetUrl,
      upload: async () => ({ storageKey: 'k', filename: 'k.png', size: 1 }),
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
