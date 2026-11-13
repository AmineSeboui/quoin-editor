import { act, waitFor } from '@testing-library/react';
import { intrinsicSize } from '../blocks/intrinsic-size';
import { mountCanvas, paragraph } from '../blocks/void/test-canvas';
import type { UploadFn } from '../types';

vi.mock('../blocks/intrinsic-size');

beforeEach(() => {
  vi.mocked(intrinsicSize).mockResolvedValue(null);
});

const pdf = (name: string) => new File(['pdf'], name, { type: 'application/pdf' });
const at = { block: 'a', region: 'text', offset: 3 };

function dropOn(upload: UploadFn | undefined, files: File[], readOnly = false) {
  const onError = vi.fn();
  const canvas = mountCanvas([paragraph('a', 'one')], { upload, onError, readOnly });
  act(() => canvas.handle().controller.onFiles?.(files, at));
  return { ...canvas, onError, messages: () => onError.mock.calls.map(([error]) => (error as Error).message) };
}

const types = (blocks: { type: string }[] | undefined) => blocks?.map((block) => block.type);

describe('files dropped or pasted on the canvas', () => {
  it('are reported as unavailable, and none goes in, when the canvas has no upload function', () => {
    const { onError, changes } = dropOn(undefined, [pdf('a.pdf')]);
    expect(onError).toHaveBeenCalledWith(new Error('Uploads are not configured for this editor.'));
    expect(changes).toEqual([]);
  });

  it("report a failed upload in the host's words, leave it out and still insert the others", async () => {
    const upload: UploadFn = async (file) => {
      if (file.name === 'bad.pdf') throw new Error('Too large');
      return { storageKey: `key/${file.name}`, filename: file.name, size: 3 };
    };
    const { messages, last } = dropOn(upload, [pdf('bad.pdf'), pdf('good.pdf')]);
    await waitFor(() => expect(types(last())).toEqual(['MARKDOWN', 'FILE', 'MARKDOWN']));
    expect(last()![1].data).toMatchObject({ storageKey: 'key/good.pdf' });
    expect(messages()).toEqual(['Too large']);
  });

  it('report a failure that brings no message of its own as "Upload failed.", as an upload into a block does', async () => {
    const reasons: unknown[] = ['nope', new Error(''), undefined];
    const upload: UploadFn = (file) => Promise.reject(reasons[Number(file.name[0])]);
    const { messages, changes } = dropOn(upload, [pdf('0.pdf'), pdf('1.pdf'), pdf('2.pdf')]);
    await waitFor(() => expect(messages()).toHaveLength(3));
    expect(messages()).toEqual(['Upload failed.', 'Upload failed.', 'Upload failed.']);
    expect(changes).toEqual([]);
  });

  it('report an upload that resolves to no stored key, or an empty one, as failed and leave it out', async () => {
    const results: unknown[] = [{ filename: 'a.pdf', size: 1 }, { storageKey: '', filename: 'b.pdf', size: 1 }, null];
    const upload = ((file: File) => Promise.resolve(results[Number(file.name[0])])) as UploadFn;
    const { messages, changes } = dropOn(upload, [pdf('0.pdf'), pdf('1.pdf'), pdf('2.pdf')]);
    await waitFor(() => expect(messages()).toHaveLength(3));
    expect(messages()).toEqual(['Upload failed.', 'Upload failed.', 'Upload failed.']);
    expect(changes).toEqual([]);
  });

  it('go in nowhere once the canvas has turned read-only while they uploaded', async () => {
    let finish!: () => void;
    const upload: UploadFn = (file) =>
      new Promise((resolve) => {
        finish = () => resolve({ storageKey: `key/${file.name}`, filename: file.name, size: 3 });
      });
    const onError = vi.fn();
    const canvas = mountCanvas([paragraph('a', 'one')], { upload, onError });
    act(() => canvas.handle().controller.onFiles?.([pdf('a.pdf')], at));
    act(() => canvas.handle().controller.setReadOnly(true));
    await act(async () => finish());
    expect(canvas.changes).toEqual([]);
    expect(onError).not.toHaveBeenCalled();
  });
});
