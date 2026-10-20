import { act, fireEvent, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bookmarkBlock, mountCanvas, paragraph } from '../blocks/void/test-canvas';
import { textSelection, type Pos } from '../engine';
import type { UploadFn, UploadResult } from '../types';
import { dragEvent, fakeTransfer } from '../view/clipboard/test-transfer';

const png = new File(['png'], 'cat.png', { type: 'image/png' });
const pdf = new File(['%PDF-1.7'], 'notes.pdf', { type: 'application/pdf' });

const stored: UploadFn = async (file) => ({ storageKey: `key/${file.name}`, filename: file.name, size: file.size });
const caretIn = (block: string): Pos => ({ block, region: 'text', offset: 0 });

const doc = document as unknown as Record<string, unknown>;

function heldUpload() {
  const pending: (() => void)[] = [];
  const result = (file: File): UploadResult => ({ storageKey: file.name, filename: file.name, size: 1 });
  const upload: UploadFn = (file) => new Promise((resolve) => pending.push(() => resolve(result(file))));
  const finish = () => act(async () => pending.splice(0).forEach((resolve) => resolve()));
  return { upload, finish };
}

const types = (blocks: { type: string }[]) => blocks.map((block) => block.type);

afterEach(() => {
  delete doc.elementFromPoint;
  delete doc.caretPositionFromPoint;
  document.body.querySelectorAll('input[aria-label="Outside"]').forEach((input) => input.remove());
});

describe('files dropped or pasted on the canvas', () => {
  it('are uploaded and land after the block they were dropped on, as image and file blocks', async () => {
    const upload = vi.fn(stored);
    const { last, shell } = mountCanvas([paragraph('a', 'one'), paragraph('b', 'two')], { upload });
    const host = shell('a').querySelector<HTMLElement>('[data-quoin-host]')!;
    doc.elementFromPoint = () => host;
    doc.caretPositionFromPoint = () => ({ offsetNode: host.firstChild, offset: 1 });
    fireEvent(host, dragEvent('drop', fakeTransfer({}, [png, pdf]).transfer, 5, 5));
    await waitFor(() => expect(last()).toHaveLength(5));
    expect(upload.mock.calls).toEqual([
      [png, 'image'],
      [pdf, 'file'],
    ]);
    expect(last()[0]).toEqual(paragraph('a', 'one'));
    expect(last()[1]).toMatchObject({ type: 'IMAGE', data: { storageKey: 'key/cat.png', alt: '' } });
    expect(last()[2]).toMatchObject({ type: 'FILE' });
    expect(last()[2].data).toEqual({ storageKey: 'key/notes.pdf', filename: 'notes.pdf', size: 8, mime: 'application/pdf' });
    expect(last()[3]).toEqual(paragraph(last()[3].id, ''));
    expect(last()[4]).toEqual(paragraph('b', 'two'));
  });

  it('leave the caret and the focus on an empty line after them, not on a block a key would replace', async () => {
    const blocks = [paragraph('a', 'one'), paragraph('b', 'two')];
    const { handle, last, selection, shell } = mountCanvas(blocks, { upload: stored });
    act(() => handle().focus(caretIn('a')));
    act(() => handle().controller.onFiles?.([pdf], caretIn('a')));
    await waitFor(() => expect(types(last())).toEqual(['MARKDOWN', 'FILE', 'MARKDOWN', 'MARKDOWN']));
    const line = last()[2];
    expect(line).toEqual(paragraph(line.id, ''));
    expect(selection()).toEqual(textSelection(caretIn(line.id)));
    expect(document.activeElement).toBe(shell(line.id).querySelector('[data-quoin-host]'));
  });

  it('land without moving the caret or the focus of a writer who moved on while they uploaded', async () => {
    const { upload, finish } = heldUpload();
    const { handle, last, selection, shell } = mountCanvas([paragraph('a', 'one'), paragraph('b', 'two')], { upload });
    act(() => handle().focus(caretIn('a')));
    act(() => handle().controller.onFiles?.([pdf], caretIn('a')));
    const typing = { block: 'b', region: 'text', offset: 2 };
    act(() => handle().focus(typing));
    await finish();
    expect(types(last())).toEqual(['MARKDOWN', 'FILE', 'MARKDOWN']);
    expect(selection()).toEqual(textSelection(typing));
    expect(document.activeElement).toBe(shell('b').querySelector('[data-quoin-host]'));
  });

  it('land without taking the focus back from a control outside the canvas', async () => {
    const { upload, finish } = heldUpload();
    const { handle, last, selection } = mountCanvas([paragraph('a', 'one')], { upload });
    act(() => handle().focus(caretIn('a')));
    act(() => handle().controller.onFiles?.([png], caretIn('a')));
    const outside = document.body.appendChild(document.createElement('input'));
    outside.setAttribute('aria-label', 'Outside');
    act(() => outside.focus());
    await finish();
    expect(types(last())).toEqual(['MARKDOWN', 'IMAGE']);
    expect(selection()).toEqual(textSelection(caretIn('a')));
    expect(document.activeElement).toBe(outside);
  });

  it('dropped on a block drawn without text land after that block', async () => {
    const blocks = [paragraph('a', 'one'), bookmarkBlock('bm', 'quoin.dev'), paragraph('b', 'two')];
    const { handle, last, shell } = mountCanvas(blocks, { upload: stored });
    act(() => handle().focus(caretIn('a')));
    const preview = within(shell('bm')).getByText('Link to quoin.dev');
    doc.elementFromPoint = () => preview;
    fireEvent(preview, dragEvent('drop', fakeTransfer({}, [png]).transfer, 5, 5));
    await waitFor(() => expect(last()).toHaveLength(5));
    const order = last().map((block) => (block.id.length > 2 ? block.type : block.id));
    expect(order).toEqual(['a', 'bm', 'IMAGE', 'MARKDOWN', 'b']);
  });

  it('go above the empty paragraph they land in, which keeps the caret', async () => {
    const { handle, last, selection } = mountCanvas([paragraph('a', 'one'), paragraph('e', '')], { upload: stored });
    act(() => handle().focus(caretIn('e')));
    act(() => handle().controller.onFiles?.([png], caretIn('e')));
    await waitFor(() => expect(types(last())).toEqual(['MARKDOWN', 'IMAGE', 'MARKDOWN']));
    expect(last()[2]).toEqual(paragraph('e', ''));
    expect(selection()).toEqual(textSelection(caretIn('e')));
  });

  it('land in an empty document, with an empty line after them for the caret', async () => {
    const { handle, last } = mountCanvas([], { upload: stored });
    act(() => handle().controller.onFiles?.([pdf], null));
    const fileThenLine = [{ type: 'FILE', data: { filename: 'notes.pdf' } }, { type: 'MARKDOWN' }];
    await waitFor(() => expect(last()).toMatchObject(fileThenLine));
  });

  it('write no type for a file that declares none', async () => {
    const { handle, last } = mountCanvas([paragraph('a', 'one')], { upload: stored });
    act(() => handle().controller.onFiles?.([new File(['x'], 'data.bin')], caretIn('a')));
    await waitFor(() => expect(types(last())).toEqual(['MARKDOWN', 'FILE', 'MARKDOWN']));
    expect(last()[1].data).toEqual({ storageKey: 'key/data.bin', filename: 'data.bin', size: 1 });
  });

  it('are left out and reported when the canvas has no upload function', async () => {
    const onError = vi.fn();
    const { changes, handle } = mountCanvas([paragraph('a', 'one')], { onError });
    act(() => handle().controller.onFiles?.([png], caretIn('a')));
    expect(onError).toHaveBeenCalledWith(new Error('Uploads are not configured for this editor.'));
    expect(changes).toHaveLength(0);
  });

  it('report a failed upload and still insert the others', async () => {
    const onError = vi.fn();
    const failure = new Error('Too large');
    const upload: UploadFn = (file) => (file === png ? Promise.reject(failure) : stored(file, 'file'));
    const { handle, last } = mountCanvas([paragraph('a', 'one')], { upload, onError });
    act(() => handle().controller.onFiles?.([png, pdf], caretIn('a')));
    await waitFor(() => expect(last()?.map((block) => block.type)).toEqual(['MARKDOWN', 'FILE', 'MARKDOWN']));
    expect(onError).toHaveBeenCalledWith(failure);
  });
});
