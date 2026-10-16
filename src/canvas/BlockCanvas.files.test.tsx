import { act, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountCanvas, paragraph } from '../blocks/void/test-canvas';
import type { Pos } from '../engine';
import type { UploadFn } from '../types';
import { dragEvent, fakeTransfer } from '../view/clipboard/test-transfer';

const png = new File(['png'], 'cat.png', { type: 'image/png' });
const pdf = new File(['%PDF-1.7'], 'notes.pdf', { type: 'application/pdf' });

const stored: UploadFn = async (file) => ({ storageKey: `key/${file.name}`, filename: file.name, size: file.size });
const caretIn = (block: string): Pos => ({ block, region: 'text', offset: 0 });

const doc = document as unknown as Record<string, unknown>;

afterEach(() => {
  delete doc.elementFromPoint;
  delete doc.caretPositionFromPoint;
});

describe('files dropped or pasted on the canvas', () => {
  it('are uploaded and land after the block they were dropped on, as image and file blocks', async () => {
    const upload = vi.fn(stored);
    const { last, shell } = mountCanvas([paragraph('a', 'one'), paragraph('b', 'two')], { upload });
    const host = shell('a').querySelector<HTMLElement>('[data-quoin-host]')!;
    doc.elementFromPoint = () => host;
    doc.caretPositionFromPoint = () => ({ offsetNode: host.firstChild, offset: 1 });
    fireEvent(host, dragEvent('drop', fakeTransfer({}, [png, pdf]).transfer, 5, 5));
    await waitFor(() => expect(last()).toHaveLength(4));
    expect(upload.mock.calls).toEqual([
      [png, 'image'],
      [pdf, 'file'],
    ]);
    expect(last()[0]).toEqual(paragraph('a', 'one'));
    expect(last()[1]).toMatchObject({ type: 'IMAGE', data: { storageKey: 'key/cat.png', alt: '' } });
    expect(last()[2]).toMatchObject({ type: 'FILE', data: { storageKey: 'key/notes.pdf', filename: 'notes.pdf', size: 8 } });
    expect(last()[3]).toEqual(paragraph('b', 'two'));
  });

  it('fill the empty paragraph they land in', async () => {
    const { handle, last } = mountCanvas([paragraph('a', 'one'), paragraph('e', '')], { upload: stored });
    act(() => handle().controller.onFiles?.([png], caretIn('e')));
    await waitFor(() =>
      expect(last()?.map((block) => [block.id, block.type])).toEqual([
        ['a', 'MARKDOWN'],
        ['e', 'IMAGE'],
      ]),
    );
  });

  it('land in an empty document', async () => {
    const { handle, last } = mountCanvas([], { upload: stored });
    act(() => handle().controller.onFiles?.([pdf], null));
    await waitFor(() => expect(last()).toMatchObject([{ type: 'FILE', data: { filename: 'notes.pdf' } }]));
  });

  it('are left out and reported when the canvas has no upload function', async () => {
    const onError = vi.fn();
    const { changes, handle } = mountCanvas([paragraph('a', 'one')], { onError });
    act(() => handle().controller.onFiles?.([png], caretIn('a')));
    expect(onError).toHaveBeenCalledWith(new Error('Uploads are not configured.'));
    expect(changes).toHaveLength(0);
  });

  it('report a failed upload and still insert the others', async () => {
    const onError = vi.fn();
    const failure = new Error('Too large');
    const upload: UploadFn = (file) => (file === png ? Promise.reject(failure) : stored(file, 'file'));
    const { handle, last } = mountCanvas([paragraph('a', 'one')], { upload, onError });
    act(() => handle().controller.onFiles?.([png, pdf], caretIn('a')));
    await waitFor(() => expect(last()?.map((block) => block.type)).toEqual(['MARKDOWN', 'FILE']));
    expect(onError).toHaveBeenCalledWith(failure);
  });
});
