import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { nodeSelection } from '../../engine';
import type { QuoinBlock, UploadFn } from '../../types';
import { mountCanvas, paragraph } from '../void/test-canvas';

const resolveAssetUrl = (key: string) => `/cdn/${key}`;
const stored: UploadFn = async (file) => ({ storageKey: `key/${file.name}`, filename: file.name, size: file.size });
const file = (data: Record<string, unknown> = {}, id = 'f'): QuoinBlock => ({
  id,
  type: 'FILE',
  data: { storageKey: 'notes.pdf', filename: 'notes.pdf', size: 1536, mime: 'application/pdf', ...data },
});
const toolbar = () => screen.queryByRole('toolbar', { name: 'File tools' });
const button = (name: string) => within(toolbar()!).getByRole('button', { name });
const names = () => within(toolbar()!).getAllByRole('button').map((each) => each.getAttribute('aria-label'));

function mount(blocks: QuoinBlock[] = [paragraph('a', 'above'), file(), paragraph('b', 'below')], props = {}) {
  const canvas = mountCanvas(blocks, { resolveAssetUrl, upload: stored, ...props });
  return { ...canvas, fileData: () => canvas.last()?.find((block) => block.id === 'f')?.data };
}

describe('the toolbar of a file', () => {
  it('shows while a file block holding a file is selected as a whole, and only then', () => {
    const { nodeSelect, handle } = mount([paragraph('a', 'above'), file(), file({ storageKey: '', filename: '' }, 'e')]);
    expect(toolbar()).toBeNull();
    nodeSelect('f');
    expect(names()).toEqual(['Replace file', 'Delete']);
    nodeSelect('e');
    expect(toolbar()).toBeNull();
    nodeSelect('f');
    act(() => handle().focus({ block: 'a', region: 'text', offset: 0 }));
    expect(toolbar()).toBeNull();
  });

  it('offers no replace button where uploads are not set up', () => {
    const { nodeSelect } = mount(undefined, { upload: undefined });
    nodeSelect('f');
    expect(names()).toEqual(['Delete']);
  });

  it('is left out on a read-only canvas', () => {
    const { nodeSelect } = mount(undefined, { readOnly: true });
    nodeSelect('f');
    expect(toolbar()).toBeNull();
  });

  it('is reached with Alt+F10, walked with the arrows, and left with Escape for the file', () => {
    const { nodeSelect, sink } = mount();
    nodeSelect('f');
    fireEvent.keyDown(sink(), { key: 'F10', altKey: true });
    expect(button('Replace file')).toHaveFocus();
    fireEvent.keyDown(button('Replace file'), { key: 'ArrowRight' });
    expect(button('Delete')).toHaveFocus();
    fireEvent.keyDown(button('Delete'), { key: 'Escape', isComposing: true });
    expect(button('Delete')).toHaveFocus();
    fireEvent.keyDown(button('Delete'), { key: 'Escape' });
    expect(sink()).toHaveFocus();
  });

  it('goes on from its buttons to the download link of the file with Tab', () => {
    const { nodeSelect, sink } = mount();
    nodeSelect('f');
    fireEvent.keyDown(sink(), { key: 'F10', altKey: true });
    fireEvent.keyDown(button('Replace file'), { key: 'Tab' });
    expect(screen.getByRole('link', { name: 'Download notes.pdf' })).toHaveFocus();
    expect(toolbar()).not.toBeNull();
  });

  it('replaces the file with an upload, keeping the name, size and type of the new one', async () => {
    const user = userEvent.setup();
    const { nodeSelect, fileData, selection } = mount();
    nodeSelect('f');
    const picker = () => toolbar()!.querySelector<HTMLInputElement>('input[type="file"]')!;
    const click = vi.spyOn(picker(), 'click');
    fireEvent.click(button('Replace file'));
    expect(click).toHaveBeenCalled();
    await user.upload(picker(), new File(['zip'], 'report.zip', { type: 'application/zip' }));
    await waitFor(() =>
      expect(fileData()).toEqual({ storageKey: 'key/report.zip', filename: 'report.zip', size: 3, mime: 'application/zip' }),
    );
    expect(screen.getByRole('link', { name: 'Download report.zip' })).toHaveAttribute('href', '/cdn/key/report.zip');
    expect(selection()).toEqual(nodeSelection('f'));
    fireEvent.change(picker(), { target: { files: [new File(['x'], 'data.bin')] } });
    await waitFor(() => expect(fileData()).toEqual({ storageKey: 'key/data.bin', filename: 'data.bin', size: 1 }));
  });

  it('reports an upload that resolves to no stored key through onError, in its own words, and writes nothing', async () => {
    const onError = vi.fn();
    const { nodeSelect, changes } = mount(undefined, { upload: async () => undefined, onError });
    nodeSelect('f');
    const picker = toolbar()!.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(picker, { target: { files: [new File(['x'], 'data.bin')] } });
    await waitFor(() => expect(onError).toHaveBeenCalledWith(new Error('Upload failed.')));
    expect(changes).toEqual([]);
  });

  it('deletes the file block and gives focus back to the editor', () => {
    const { nodeSelect, last } = mount();
    nodeSelect('f');
    fireEvent.click(button('Delete'));
    expect(last().map((block) => block.id)).toEqual(['a', 'b']);
    expect(toolbar()).toBeNull();
    expect(document.activeElement?.closest('.quoin-editor')).not.toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { nodeSelect } = mount();
    nodeSelect('f');
    expect(await act(() => axe(toolbar()!))).toHaveNoViolations();
  });
});
