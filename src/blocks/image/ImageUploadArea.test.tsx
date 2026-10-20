import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { nodeSelection, textSelection } from '../../engine';
import type { QuoinBlock, UploadFn } from '../../types';
import { clipboardEvent, dragEvent, fakeTransfer } from '../../view/clipboard/test-transfer';
import { intrinsicSize } from '../intrinsic-size';
import { mountCanvas, paragraph } from '../void/test-canvas';

vi.mock('../intrinsic-size');

const png = new File(['png'], 'cat.png', { type: 'image/png' });
const pdf = new File(['%PDF'], 'notes.pdf', { type: 'application/pdf' });
const stored: UploadFn = async (file) => ({ storageKey: `key/${file.name}`, filename: file.name, size: file.size });
const resolveAssetUrl = (key: string) => `/cdn/${key}`;
const empty: QuoinBlock = { id: 'i', type: 'IMAGE', data: { storageKey: '', alt: '' } };
const area = () => document.querySelector<HTMLElement>('.quoin-image-upload')!;

beforeEach(() => {
  vi.mocked(intrinsicSize).mockResolvedValue({ width: 40, height: 30 });
});

function mount(upload: UploadFn | null = vi.fn(stored)) {
  const canvas = mountCanvas([paragraph('a', 'above'), empty], { upload: upload ?? undefined, resolveAssetUrl });
  return { ...canvas, upload, imageData: () => canvas.last()?.find((block) => block.id === 'i')?.data };
}

describe('an image block with no picture yet', () => {
  it('uploads a picked image into itself, then draws it with its measured size', async () => {
    const user = userEvent.setup();
    const { upload, imageData } = mount();
    await user.upload(screen.getByLabelText('Upload image'), png);
    await waitFor(() => expect(imageData()).toEqual({ storageKey: 'key/cat.png', alt: '', width: 40, height: 30 }));
    expect(upload).toHaveBeenCalledWith(png, 'image');
    expect(screen.getByRole('img', { name: 'Image, no description' })).toHaveAttribute('src', '/cdn/key/cat.png');
  });

  it('hands focus to the image, selected as a whole, once the upload picked from its button lands', async () => {
    const { selection, sink } = mount();
    const field = screen.getByLabelText('Upload image');
    act(() => field.focus());
    fireEvent.change(field, { target: { files: [png] } });
    await waitFor(() => expect(selection()).toEqual(nodeSelection('i')));
    expect(sink()).toHaveFocus();
  });

  it('leaves focus where it is when focus left it while the upload ran', async () => {
    const { selection, handle } = mount();
    const field = screen.getByLabelText('Upload image');
    act(() => field.focus());
    fireEvent.change(field, { target: { files: [png] } });
    act(() => handle().focus({ block: 'a', region: 'text', offset: 2 }));
    await screen.findByRole('img');
    expect(selection()).toEqual(textSelection({ block: 'a', region: 'text', offset: 2 }));
  });

  it('takes an image dropped on it into itself, where the canvas would add a block for it', async () => {
    const { last, imageData } = mount();
    const drop = dragEvent('drop', fakeTransfer({}, [png]).transfer);
    act(() => void area().dispatchEvent(drop));
    expect(drop.defaultPrevented).toBe(true);
    await waitFor(() => expect(imageData()).toMatchObject({ storageKey: 'key/cat.png' }));
    expect(last()).toHaveLength(2);
  });

  it('leaves a dropped file that is no image to the canvas, which adds a file block after it', async () => {
    const { last } = mount();
    document.elementFromPoint = () => area();
    try {
      act(() => void area().dispatchEvent(dragEvent('drop', fakeTransfer({}, [pdf]).transfer)));
      await waitFor(() => expect(last()?.map((block) => block.type)).toEqual(['MARKDOWN', 'IMAGE', 'FILE', 'MARKDOWN']));
    } finally {
      delete (document as Partial<Document>).elementFromPoint;
    }
  });

  it('takes an image pasted while focus is in it', async () => {
    const { imageData } = mount();
    const field = screen.getByLabelText('Upload image');
    act(() => field.focus());
    const paste = clipboardEvent('paste', fakeTransfer({}, [png]).transfer);
    act(() => void field.dispatchEvent(paste));
    expect(paste.defaultPrevented).toBe(true);
    await waitFor(() => expect(imageData()).toMatchObject({ storageKey: 'key/cat.png' }));
  });

  it('says it is uploading, and shows why an upload failed', async () => {
    const user = userEvent.setup();
    let fail!: (cause: Error) => void;
    mount(() => new Promise((_, reject) => (fail = reject)));
    await user.upload(screen.getByLabelText('Upload image'), png);
    expect(within(area()).getByRole('status')).toHaveTextContent('Uploading...');
    await act(async () => fail(new Error('That file is too large.')));
    expect(within(area()).getByRole('alert')).toHaveTextContent('That file is too large.');
    expect(within(area()).getByRole('status')).toHaveTextContent('');
  });

  it('embeds a picture from a link, and refuses an address that is no link', async () => {
    const user = userEvent.setup();
    const { imageData, selection } = mount();
    await user.click(screen.getByRole('button', { name: 'Embed link' }));
    const field = screen.getByRole('textbox', { name: 'Image link' });
    expect(field).toHaveFocus();
    await user.type(field, 'javascript:alert(1){Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid link');
    await user.clear(field);
    await user.type(field, 'quoin.dev/cat.png{Enter}');
    expect(imageData()).toEqual({ storageKey: '', alt: '', url: 'https://quoin.dev/cat.png' });
    expect(selection()).toEqual(nodeSelection('i'));
  });

  it('selects the block on Escape, and when the space around its controls is clicked', async () => {
    const user = userEvent.setup();
    const { selection, handle, sink } = mount();
    await user.click(screen.getByRole('button', { name: 'Embed link' }));
    const link = screen.getByRole('textbox', { name: 'Image link' });
    fireEvent.keyDown(link, { key: 'Escape', isComposing: true });
    fireEvent.keyDown(link, { key: 'Escape', keyCode: 229 });
    expect(link).toHaveFocus();
    fireEvent.keyDown(link, { key: 'Escape' });
    expect(selection()).toEqual(nodeSelection('i'));
    expect(sink()).toHaveFocus();
    expect(screen.queryByRole('textbox', { name: 'Image link' })).toBeNull();
    act(() => handle().focus({ block: 'a', region: 'text', offset: 0 }));
    fireEvent.click(area());
    expect(selection()).toEqual(nodeSelection('i'));
  });

  it('focuses its upload button on Enter, and keeps the block when a key is typed on it', () => {
    const { nodeSelect, press, last } = mount();
    nodeSelect('i');
    press('x');
    expect(last()).toBeUndefined();
    press('Enter');
    expect(screen.getByLabelText('Upload image')).toHaveFocus();
  });

  it('says uploads are not set up when the canvas has no upload function, and still embeds links', () => {
    mount(null);
    expect(screen.getByLabelText('Upload image')).toBeDisabled();
    expect(screen.getByText('Uploads are not configured for this editor.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Embed link' })).toBeEnabled();
  });
});
