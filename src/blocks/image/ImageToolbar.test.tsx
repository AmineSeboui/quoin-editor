import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { nodeSelection } from '../../engine';
import type { QuoinBlock, UploadFn } from '../../types';
import { intrinsicSize } from '../intrinsic-size';
import { mountCanvas, paragraph } from '../void/test-canvas';

vi.mock('../intrinsic-size');

const resolveAssetUrl = (key: string) => `/cdn/${key}`;
const stored: UploadFn = async (file) => ({ storageKey: `key/${file.name}`, filename: file.name, size: file.size });
const image = (data: Record<string, unknown> = {}): QuoinBlock => ({
  id: 'i',
  type: 'IMAGE',
  data: { storageKey: 'cat.png', alt: 'A cat', ...data },
});
const toolbar = () => screen.queryByRole('toolbar', { name: 'Image tools' });
const button = (name: string) => within(toolbar()!).getByRole('button', { name });

beforeEach(() => {
  vi.mocked(intrinsicSize).mockResolvedValue(null);
});

function mount(blocks: QuoinBlock[] = [paragraph('a', 'above'), image(), paragraph('b', 'below')], props = {}) {
  const canvas = mountCanvas(blocks, { resolveAssetUrl, upload: stored, ...props });
  const imageData = () => canvas.last()?.find((block) => block.id === 'i')?.data;
  return { ...canvas, imageData };
}

describe('the toolbar of an image', () => {
  it('shows while the image is selected as a whole, and only then', () => {
    const { nodeSelect, handle } = mount();
    expect(toolbar()).toBeNull();
    nodeSelect('i');
    const names = within(toolbar()!).getAllByRole('button').map((each) => each.getAttribute('aria-label'));
    expect(names).toEqual(['Align left', 'Align center', 'Align right', 'Replace image', 'Alt text', 'Download', 'Delete']);
    act(() => handle().focus({ block: 'a', region: 'text', offset: 0 }));
    expect(toolbar()).toBeNull();
  });

  it('shows for no image without a picture, and on no read-only canvas', () => {
    const empty = { id: 'e', type: 'IMAGE', data: { storageKey: '', alt: '' } };
    const editable = mount([image(), empty]);
    editable.nodeSelect('e');
    expect(toolbar()).toBeNull();
    editable.nodeSelect('i');
    expect(toolbar()).not.toBeNull();
  });

  it('is left out on a read-only canvas', () => {
    const { nodeSelect } = mount(undefined, { readOnly: true });
    nodeSelect('i');
    expect(toolbar()).toBeNull();
  });

  it('aligns the image, showing the alignment it has, and keeps the image selected', () => {
    const { nodeSelect, imageData, selection } = mount();
    nodeSelect('i');
    expect(button('Align left')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button('Align center'));
    expect(imageData()).toEqual({ storageKey: 'cat.png', alt: 'A cat', align: 'center' });
    expect(button('Align center')).toHaveAttribute('aria-pressed', 'true');
    expect(button('Align left')).toHaveAttribute('aria-pressed', 'false');
    expect(selection()).toEqual(nodeSelection('i'));
  });

  it('is reached with Alt+F10, walked with the arrows, and left with Escape for the image', () => {
    const { nodeSelect, sink } = mount();
    nodeSelect('i');
    fireEvent.keyDown(sink(), { key: 'F10', altKey: true });
    expect(button('Align left')).toHaveFocus();
    fireEvent.keyDown(button('Align left'), { key: 'ArrowRight' });
    expect(button('Align center')).toHaveFocus();
    fireEvent.keyDown(button('Align center'), { key: 'End' });
    expect(button('Delete')).toHaveFocus();
    fireEvent.keyDown(button('Delete'), { key: 'Escape', isComposing: true });
    fireEvent.keyDown(button('Delete'), { key: 'Tab', keyCode: 229 });
    expect(button('Delete')).toHaveFocus();
    fireEvent.keyDown(button('Delete'), { key: 'Escape' });
    expect(sink()).toHaveFocus();
  });

  it('goes on from its last button to the width of the image with Tab', () => {
    const { nodeSelect, sink } = mount();
    nodeSelect('i');
    fireEvent.keyDown(sink(), { key: 'F10', altKey: true });
    fireEvent.keyDown(button('Align left'), { key: 'Tab' });
    expect(screen.getByRole('slider', { name: 'Resize from the right' })).toHaveFocus();
  });

  it('replaces the picture with an upload', async () => {
    const user = userEvent.setup();
    const { nodeSelect, imageData, container } = mount();
    nodeSelect('i');
    const picker = toolbar()!.querySelector<HTMLInputElement>('input[type="file"]')!;
    const click = vi.spyOn(picker, 'click');
    fireEvent.click(button('Replace image'));
    expect(click).toHaveBeenCalled();
    await user.upload(picker, new File(['png'], 'dog.png', { type: 'image/png' }));
    await waitFor(() => expect(imageData()).toEqual({ storageKey: 'key/dog.png', alt: 'A cat' }));
    expect(container.querySelector('img')).toHaveAttribute('src', '/cdn/key/dog.png');
  });

  it('downloads the picture from the address the host gives its key', () => {
    const { nodeSelect } = mount();
    nodeSelect('i');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      fireEvent.click(button('Download'));
      const link = click.mock.contexts[0] as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/cdn/cat.png');
      expect(link).toHaveAttribute('download');
    } finally {
      click.mockRestore();
    }
  });

  it('deletes the image and gives focus back to the editor', () => {
    const { nodeSelect, last } = mount();
    nodeSelect('i');
    fireEvent.click(button('Delete'));
    expect(last().map((block) => block.id)).toEqual(['a', 'b']);
    expect(toolbar()).toBeNull();
    expect(document.activeElement?.closest('.quoin-editor')).not.toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { nodeSelect } = mount();
    nodeSelect('i');
    expect(await act(() => axe(toolbar()!))).toHaveNoViolations();
  });
});

describe('the alt text of an image', () => {
  it('is asked for as required, saved on Enter, and focus goes back to the image', async () => {
    const user = userEvent.setup();
    const { nodeSelect, imageData, sink } = mount([image({ alt: '' })]);
    nodeSelect('i');
    await user.click(button('Alt text'));
    const field = screen.getByRole('textbox', { name: 'Alt text' });
    expect(field).toHaveFocus();
    expect(field).toBeRequired();
    expect(field).toHaveAccessibleDescription('Required. Describe what the image shows for anyone who cannot see it.');
    await user.type(field, 'A sleepy cat{Enter}');
    expect(imageData()).toEqual({ storageKey: 'cat.png', alt: 'A sleepy cat' });
    expect(screen.getByRole('img', { name: 'A sleepy cat' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Alt text' })).toBeNull();
    expect(sink()).toHaveFocus();
  });

  it('is saved by its Save button, and left as it was on Escape', async () => {
    const user = userEvent.setup();
    const { nodeSelect, imageData, changes } = mount();
    nodeSelect('i');
    await user.click(button('Alt text'));
    const field = screen.getByRole('textbox', { name: 'Alt text' });
    await user.type(field, ' asleep');
    fireEvent.keyDown(field, { key: 'Escape', keyCode: 229 });
    expect(field).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(changes).toEqual([]);
    await user.click(button('Alt text'));
    await user.clear(screen.getByRole('textbox', { name: 'Alt text' }));
    await user.type(screen.getByRole('textbox', { name: 'Alt text' }), 'A dog');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(imageData()).toEqual({ storageKey: 'cat.png', alt: 'A dog' });
  });

  it('keeps its toolbar while Tab goes from its field to Save, and Tab from Save stores it and goes back to the image', async () => {
    const user = userEvent.setup();
    const { nodeSelect, imageData, sink } = mount();
    nodeSelect('i');
    await user.click(button('Alt text'));
    await user.type(screen.getByRole('textbox', { name: 'Alt text' }), ' asleep');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    expect(toolbar()).not.toBeNull();
    await user.tab();
    expect(imageData()).toEqual({ storageKey: 'cat.png', alt: 'A cat asleep' });
    expect(sink()).toHaveFocus();
  });

  it('is stored by a click on Save, which gives focus back to the image', async () => {
    const user = userEvent.setup();
    const { nodeSelect, imageData, sink } = mount();
    nodeSelect('i');
    await user.click(button('Alt text'));
    await user.type(screen.getByRole('textbox', { name: 'Alt text' }), ' asleep');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(imageData()).toEqual({ storageKey: 'cat.png', alt: 'A cat asleep' });
    expect(sink()).toHaveFocus();
  });

  it('is stored by Tab out of its last control or Shift+Tab out of its first, which go back to the image', async () => {
    const user = userEvent.setup();
    const { nodeSelect, imageData, sink } = mount();
    nodeSelect('i');
    await user.click(button('Alt text'));
    await user.type(screen.getByRole('textbox', { name: 'Alt text' }), ' asleep');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Save' }), { key: 'Tab' });
    expect(imageData()).toEqual({ storageKey: 'cat.png', alt: 'A cat asleep' });
    expect(sink()).toHaveFocus();
    await user.click(button('Alt text'));
    await user.type(screen.getByRole('textbox', { name: 'Alt text' }), ' again');
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Alt text' }), { key: 'Tab', shiftKey: true });
    expect(imageData()).toEqual({ storageKey: 'cat.png', alt: 'A cat asleep again' });
    expect(screen.queryByRole('textbox', { name: 'Alt text' })).toBeNull();
  });

  it('stays open with what was typed, and its toolbar, when focus goes nowhere, as when the window loses it', async () => {
    const user = userEvent.setup();
    const { nodeSelect, changes } = mount();
    nodeSelect('i');
    await user.click(button('Alt text'));
    const field = screen.getByRole('textbox', { name: 'Alt text' });
    await user.type(field, ' asleep');
    act(() => field.blur());
    expect(changes).toEqual([]);
    expect(screen.getByRole('textbox', { name: 'Alt text' })).toHaveValue('A cat asleep');
    expect(toolbar()).not.toBeNull();
  });

  it('is stored when a click lands elsewhere, in the text or on the picture', async () => {
    const user = userEvent.setup();
    const { nodeSelect, imageData, shell } = mount();
    for (const [typed, target] of [
      [' asleep', () => shell('a').querySelector('[data-quoin-host]')!],
      [' again', () => screen.getByRole('img')],
    ] as const) {
      nodeSelect('i');
      await user.click(button('Alt text'));
      await user.type(screen.getByRole('textbox', { name: 'Alt text' }), typed);
      await user.click(target());
    }
    expect(imageData()).toEqual({ storageKey: 'cat.png', alt: 'A cat asleep again' });
  });

  it('is stored by a click on a control outside the editor, which keeps the focus it took and the keys typed next', async () => {
    const user = userEvent.setup();
    const { nodeSelect, imageData } = mount();
    const outside = document.body.appendChild(document.createElement('input'));
    outside.setAttribute('aria-label', 'Search');
    try {
      nodeSelect('i');
      await user.click(button('Alt text'));
      await user.type(screen.getByRole('textbox', { name: 'Alt text' }), ' asleep');
      await user.click(outside);
      expect(imageData()).toEqual({ storageKey: 'cat.png', alt: 'A cat asleep' });
      expect(outside).toHaveFocus();
      await user.keyboard('Q');
      expect(outside).toHaveValue('Q');
      expect(imageData()).toEqual({ storageKey: 'cat.png', alt: 'A cat asleep' });
    } finally {
      outside.remove();
    }
  });

  it('is stored when a script moves focus elsewhere, which keeps it there', async () => {
    const user = userEvent.setup();
    const { nodeSelect, imageData } = mount();
    const outside = document.body.appendChild(document.createElement('input'));
    try {
      nodeSelect('i');
      await user.click(button('Alt text'));
      await user.type(screen.getByRole('textbox', { name: 'Alt text' }), ' asleep');
      act(() => outside.focus());
      expect(imageData()).toEqual({ storageKey: 'cat.png', alt: 'A cat asleep' });
      expect(outside).toHaveFocus();
      expect(screen.queryByRole('textbox', { name: 'Alt text' })).toBeNull();
    } finally {
      outside.remove();
    }
  });

  it('has no accessibility violations', async () => {
    const user = userEvent.setup();
    const { nodeSelect } = mount();
    nodeSelect('i');
    await user.click(button('Alt text'));
    const field = screen.getByRole('textbox', { name: 'Alt text' });
    expect(await axe(field.closest('[role="dialog"]') ?? field.closest('form')!)).toHaveNoViolations();
  });
});
