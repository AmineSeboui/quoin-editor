import { act } from '@testing-library/react';
import { undo } from '../../engine';
import { setAttrs } from '../../engine/commands/block-style';
import type { QuoinBlock, UploadFn, UploadResult } from '../../types';
import { onBlock } from '../../view/react/block-command';
import { mountCanvas, paragraph } from '../void/test-canvas';
import { uploadFile } from './file-upload';

// Each upload waits until the test settles it, in whatever order the test picks.
function held() {
  const uploads = new Map<string, (result: UploadResult) => void>();
  const upload: UploadFn = (file) => new Promise((resolve) => uploads.set(file.name, resolve));
  const uploaded = (name: string, storageKey: string) =>
    act(async () => uploads.get(name)!({ storageKey, filename: name, size: 7 }));
  return { upload, uploaded };
}

const resolveAssetUrl = (key: string) => `/cdn/${key}`;
const pdf = (name: string) => new File(['%PDF'], name, { type: 'application/pdf' });
const block = (data: Record<string, unknown>): QuoinBlock => ({ id: 'f', type: 'FILE', data: { storageKey: '', filename: '', ...data } });

function mountFile(data: Record<string, unknown> = {}, readOnly = false) {
  const canvas = mountCanvas([paragraph('a', 'above'), block(data)], { resolveAssetUrl, readOnly });
  return { ...canvas, fileData: () => canvas.last()?.[1].data, controller: () => canvas.handle().controller };
}

describe('an upload into a file block', () => {
  it('writes the key, name, size and type of the file as one step of history', async () => {
    const { upload, uploaded } = held();
    const { controller, fileData } = mountFile();
    const done = uploadFile(controller(), 'f', pdf('notes.pdf'), { upload, resolveAssetUrl });
    await uploaded('notes.pdf', 'k1');
    await act(() => done);
    expect(fileData()).toEqual({ storageKey: 'k1', filename: 'notes.pdf', size: 7, mime: 'application/pdf' });
    act(() => void controller().run(undo));
    expect(fileData()).toEqual({ storageKey: '', filename: '' });
  });

  it('keeps the newest of two uploads, whichever lands last', async () => {
    const { upload, uploaded } = held();
    const { controller, fileData } = mountFile();
    const older = uploadFile(controller(), 'f', pdf('old.pdf'), { upload, resolveAssetUrl });
    const newer = uploadFile(controller(), 'f', pdf('new.pdf'), { upload, resolveAssetUrl });
    await uploaded('new.pdf', 'k-new');
    await uploaded('old.pdf', 'k-old');
    await act(() => Promise.all([older, newer]));
    expect(fileData()).toMatchObject({ storageKey: 'k-new', filename: 'new.pdf' });
  });

  it('rejects with no message of its own, writing nothing, when the upload resolves to no stored key', async () => {
    const { controller, changes } = mountFile();
    for (const junk of [undefined, null, {}, { storageKey: 7 }]) {
      const upload = async () => junk as unknown as UploadResult;
      await expect(uploadFile(controller(), 'f', pdf('notes.pdf'), { upload, resolveAssetUrl })).rejects.toThrow(/^$/);
    }
    expect(changes).toEqual([]);
  });

  it('drops an upload that lands once the block holds another file, and writes nothing to a read-only canvas', async () => {
    const { upload, uploaded } = held();
    const { controller, fileData } = mountFile();
    const done = uploadFile(controller(), 'f', pdf('notes.pdf'), { upload, resolveAssetUrl });
    act(() => void controller().run(onBlock('f', setAttrs({ storageKey: 'other' }))));
    await uploaded('notes.pdf', 'k1');
    await act(() => done);
    expect(fileData()).toEqual({ storageKey: 'other', filename: '' });
    const readOnly = mountFile({ storageKey: 'k0' }, true);
    const late = uploadFile(readOnly.controller(), 'f', pdf('late.pdf'), { upload, resolveAssetUrl });
    await uploaded('late.pdf', 'k2');
    await act(() => late);
    expect(readOnly.changes).toEqual([]);
  });
});
