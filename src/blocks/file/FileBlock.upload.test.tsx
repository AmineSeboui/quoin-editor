import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { nodeSelection } from '../../engine';
import type { QuoinBlock, UploadFn } from '../../types';
import { clipboardEvent, dragEvent, fakeTransfer } from '../../view/clipboard/test-transfer';
import { mountCanvas, paragraph } from '../void/test-canvas';

const pdf = new File(['%PDF'], 'notes.pdf', { type: 'application/pdf' });
const png = new File(['png'], 'cat.png', { type: 'image/png' });
const stored: UploadFn = async (file) => ({ storageKey: `key/${file.name}`, filename: file.name, size: file.size });
const resolveAssetUrl = (key: string) => `/cdn/${key}`;
const empty: QuoinBlock = { id: 'f', type: 'FILE', data: { storageKey: '', filename: '' } };
const area = () => document.querySelector<HTMLElement>('.quoin-upload')!;
const picker = () => screen.getByLabelText('Upload file');

function mount(upload: UploadFn | null = vi.fn(stored), onError = vi.fn()) {
  const canvas = mountCanvas([paragraph('a', 'above'), empty], { upload: upload ?? undefined, resolveAssetUrl, onError });
  return { ...canvas, upload, fileData: () => canvas.last()?.find((block) => block.id === 'f')?.data };
}

describe('a file block with no file yet', () => {
  it('uploads a picked file into itself, keeping its name, size and type, and draws it as a card', async () => {
    const user = userEvent.setup();
    const { upload, fileData } = mount();
    expect(screen.getByText('Or drop or paste a file here.')).toBeInTheDocument();
    await user.upload(picker(), pdf);
    await waitFor(() =>
      expect(fileData()).toEqual({ storageKey: 'key/notes.pdf', filename: 'notes.pdf', size: 4, mime: 'application/pdf' }),
    );
    expect(upload).toHaveBeenCalledWith(pdf, 'file');
    expect(screen.getByRole('link', { name: 'Download notes.pdf' })).toHaveAttribute('href', '/cdn/key/notes.pdf');
  });

  it('writes no type for a file that declares none', async () => {
    const user = userEvent.setup();
    const { fileData } = mount();
    await user.upload(picker(), new File(['x'], 'data.bin'));
    await waitFor(() => expect(fileData()).toEqual({ storageKey: 'key/data.bin', filename: 'data.bin', size: 1 }));
  });

  it('hands focus to the block, selected as a whole, once the upload picked from its button lands', async () => {
    const { selection, sink } = mount();
    act(() => picker().focus());
    fireEvent.change(picker(), { target: { files: [pdf] } });
    await waitFor(() => expect(selection()).toEqual(nodeSelection('f')));
    expect(sink()).toHaveFocus();
  });

  it('takes any file dropped on it into itself, where the canvas would add a block for it', async () => {
    const { last, fileData } = mount();
    const drop = dragEvent('drop', fakeTransfer({}, [png]).transfer);
    act(() => void area().dispatchEvent(drop));
    expect(drop.defaultPrevented).toBe(true);
    await waitFor(() => expect(fileData()).toMatchObject({ storageKey: 'key/cat.png', mime: 'image/png' }));
    expect(last()).toHaveLength(2);
  });

  it('takes a file pasted while focus is in it', async () => {
    const { fileData } = mount();
    act(() => picker().focus());
    const paste = clipboardEvent('paste', fakeTransfer({}, [pdf]).transfer);
    act(() => void picker().dispatchEvent(paste));
    expect(paste.defaultPrevented).toBe(true);
    await waitFor(() => expect(fileData()).toMatchObject({ storageKey: 'key/notes.pdf' }));
  });

  it('says it is uploading, and shows why an upload failed', async () => {
    const user = userEvent.setup();
    let fail!: (cause: Error) => void;
    mount(() => new Promise((_, reject) => (fail = reject)));
    await user.upload(picker(), pdf);
    expect(within(area()).getByRole('status')).toHaveTextContent('Uploading...');
    await act(async () => fail(new Error('That file is too large.')));
    expect(within(area()).getByRole('alert')).toHaveTextContent('That file is too large.');
  });

  it('says uploads are not set up when the canvas has none, and through onError when a file is dropped or pasted', () => {
    const onError = vi.fn();
    mount(null, onError);
    expect(picker()).toBeDisabled();
    expect(screen.getByText('Uploads are not configured for this editor.')).toBeInTheDocument();
    act(() => void area().dispatchEvent(dragEvent('drop', fakeTransfer({}, [pdf]).transfer)));
    act(() => void area().dispatchEvent(clipboardEvent('paste', fakeTransfer({}, [pdf]).transfer)));
    expect(onError.mock.calls).toEqual([
      [new Error('Uploads are not configured for this editor.')],
      [new Error('Uploads are not configured for this editor.')],
    ]);
  });

  it('focuses its upload button on Enter, keeps the block when a key is typed on it, and is selected again on Escape', () => {
    const { nodeSelect, press, last, selection, sink } = mount();
    nodeSelect('f');
    press('x');
    expect(last()).toBeUndefined();
    press('Enter');
    expect(picker()).toHaveFocus();
    fireEvent.keyDown(picker(), { key: 'Escape', keyCode: 229 });
    expect(picker()).toHaveFocus();
    fireEvent.keyDown(picker(), { key: 'Escape' });
    expect(selection()).toEqual(nodeSelection('f'));
    expect(sink()).toHaveFocus();
  });
});
