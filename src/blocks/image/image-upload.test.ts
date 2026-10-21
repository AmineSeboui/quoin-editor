import { act } from '@testing-library/react';
import { removeBlocksStep, undo } from '../../engine';
import { setAttrs } from '../../engine/commands/block-style';
import { onBlock } from '../../view/react/block-command';
import type { QuoinBlock, UploadFn, UploadResult } from '../../types';
import { intrinsicSize, type IntrinsicSize } from '../intrinsic-size';
import { mountCanvas, paragraph } from '../void/test-canvas';
import { measureImage, uploadImage } from './image-upload';

vi.mock('../intrinsic-size');

beforeEach(() => {
  vi.mocked(intrinsicSize).mockReset();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

// Each upload and each measurement waits until the test settles it, in whatever order the test picks.
function held() {
  const uploads = new Map<string, ReturnType<typeof deferred<UploadResult>>>();
  const sizes = new Map<string, ReturnType<typeof deferred<IntrinsicSize | null>>>();
  const upload: UploadFn = (file) => {
    const pending = deferred<UploadResult>();
    uploads.set(file.name, pending);
    return pending.promise;
  };
  vi.mocked(intrinsicSize).mockImplementation((src) => {
    const pending = deferred<IntrinsicSize | null>();
    sizes.set(src, pending);
    return pending.promise;
  });
  const uploaded = (name: string, storageKey: string) =>
    act(async () => uploads.get(name)!.resolve({ storageKey, filename: name, size: 1 }));
  const measured = (src: string, size: IntrinsicSize | null) => act(async () => sizes.get(src)!.resolve(size));
  return { upload, uploaded, measured, uploads };
}

const resolveAssetUrl = (key: string) => `/cdn/${key}`;
const png = (name: string) => new File(['png'], name, { type: 'image/png' });
const image = (data: Record<string, unknown>): QuoinBlock => ({ id: 'i', type: 'IMAGE', data: { storageKey: '', alt: '', ...data } });

function mountImage(data: Record<string, unknown> = {}, readOnly = false) {
  const canvas = mountCanvas([paragraph('a', 'above'), image(data)], { resolveAssetUrl, readOnly });
  const imageData = () => canvas.last()?.[1].data;
  const controller = () => canvas.handle().controller;
  return { ...canvas, imageData, controller };
}

describe('an upload into an image block', () => {
  it('writes the key as soon as the upload resolves, then the measured size, with no other field', async () => {
    const { upload, uploaded, measured } = held();
    const { controller, imageData } = mountImage({ alt: 'A cat' });
    const done = uploadImage(controller(), 'i', png('cat.png'), { upload, resolveAssetUrl });
    await uploaded('cat.png', 'k1');
    expect(imageData()).toEqual({ storageKey: 'k1', alt: 'A cat' });
    await measured('/cdn/k1', { width: 40, height: 30 });
    await act(() => done);
    expect(imageData()).toEqual({ storageKey: 'k1', alt: 'A cat', width: 40, height: 30 });
  });

  it('keeps the newest key when an older upload resolves after it, and never writes the older size', async () => {
    const { upload, uploaded, measured } = held();
    const { controller, imageData } = mountImage();
    const older = uploadImage(controller(), 'i', png('old.png'), { upload, resolveAssetUrl });
    const newer = uploadImage(controller(), 'i', png('new.png'), { upload, resolveAssetUrl });
    await uploaded('new.png', 'k-new');
    await uploaded('old.png', 'k-old');
    await act(() => older);
    expect(imageData()).toEqual({ storageKey: 'k-new', alt: '' });
    await measured('/cdn/k-new', { width: 20, height: 10 });
    await act(() => newer);
    expect(imageData()).toEqual({ storageKey: 'k-new', alt: '', width: 20, height: 10 });
  });

  it('drops the measurement of an older upload that a newer one overtook while it was measured', async () => {
    const { upload, uploaded, measured } = held();
    const { controller, imageData } = mountImage();
    const older = uploadImage(controller(), 'i', png('old.png'), { upload, resolveAssetUrl });
    await uploaded('old.png', 'k-old');
    const newer = uploadImage(controller(), 'i', png('new.png'), { upload, resolveAssetUrl });
    await uploaded('new.png', 'k-new');
    await measured('/cdn/k-old', { width: 99, height: 99 });
    await act(() => older);
    expect(imageData()).toEqual({ storageKey: 'k-new', alt: '' });
    await measured('/cdn/k-new', { width: 20, height: 10 });
    await act(() => newer);
    expect(imageData()).toEqual({ storageKey: 'k-new', alt: '', width: 20, height: 10 });
  });

  it('replaces a linked image, dropping its link and the size of the old picture', async () => {
    const { upload, uploaded, measured } = held();
    const { controller, imageData } = mountImage({ url: 'https://quoin.dev/a.png', width: 5, height: 5, align: 'center' });
    const done = uploadImage(controller(), 'i', png('cat.png'), { upload, resolveAssetUrl });
    await uploaded('cat.png', 'k1');
    expect(imageData()).toEqual({ storageKey: 'k1', alt: '', align: 'center' });
    await measured('/cdn/k1', null);
    await act(() => done);
    expect(imageData()).toEqual({ storageKey: 'k1', alt: '', align: 'center' });
  });

  it('undoes the upload in one step, the measured size with it', async () => {
    const { upload, uploaded, measured } = held();
    const { controller, imageData } = mountImage();
    const done = uploadImage(controller(), 'i', png('cat.png'), { upload, resolveAssetUrl });
    await uploaded('cat.png', 'k1');
    await measured('/cdn/k1', { width: 40, height: 30 });
    await act(() => done);
    act(() => void controller().run(undo));
    expect(imageData()).toEqual({ storageKey: '', alt: '' });
  });

  it('drops a measurement that lands once the key it measured is undone', async () => {
    const { upload, uploaded, measured } = held();
    const { controller, imageData } = mountImage();
    const done = uploadImage(controller(), 'i', png('cat.png'), { upload, resolveAssetUrl });
    await uploaded('cat.png', 'k1');
    act(() => void controller().run(undo));
    await measured('/cdn/k1', { width: 40, height: 30 });
    await act(() => done);
    expect(imageData()).toEqual({ storageKey: '', alt: '' });
  });

  it('drops an upload that lands once the block was given a link or another key', async () => {
    const { upload, uploaded } = held();
    const { controller, imageData } = mountImage();
    for (const patch of [{ url: 'https://quoin.dev/a.png' }, { url: undefined, storageKey: 'other' }]) {
      const done = uploadImage(controller(), 'i', png('cat.png'), { upload, resolveAssetUrl });
      act(() => void controller().run(onBlock('i', setAttrs(patch))));
      await uploaded('cat.png', 'k1');
      await act(() => done);
    }
    expect(imageData()).toEqual({ storageKey: 'other', alt: '' });
  });

  it('writes nothing to a read-only canvas', async () => {
    const { upload, uploaded, measured } = held();
    const { controller, changes } = mountImage({ storageKey: 'k0' }, true);
    const done = uploadImage(controller(), 'i', png('cat.png'), { upload, resolveAssetUrl });
    await uploaded('cat.png', 'k1');
    await act(() => done);
    const measuring = measureImage(controller(), 'i', 'k0', resolveAssetUrl);
    await measured('/cdn/k0', { width: 8, height: 6 });
    await act(() => measuring);
    expect(changes).toEqual([]);
  });

  it('rejects with the upload failure and leaves the block as it was', async () => {
    const { upload, uploads } = held();
    const { controller, changes } = mountImage();
    const done = uploadImage(controller(), 'i', png('cat.png'), { upload, resolveAssetUrl });
    uploads.get('cat.png')!.reject(new Error('Too large'));
    await expect(done).rejects.toThrow('Too large');
    expect(changes).toEqual([]);
  });

  it('writes nothing once the upload lands to a block that is gone', async () => {
    const { upload, uploaded } = held();
    const { controller, changes } = mountImage();
    const done = uploadImage(controller(), 'i', png('cat.png'), { upload, resolveAssetUrl });
    act(() => controller().dispatch(controller().editor.createTransaction().step(removeBlocksStep(1, 1))));
    await uploaded('cat.png', 'k1');
    await act(() => done);
    expect(changes.at(-1)).toEqual([paragraph('a', 'above')]);
  });
});

describe('measuring an image already uploaded', () => {
  it('writes the size of the picture the key names', async () => {
    const { measured } = held();
    const { controller, imageData } = mountImage({ storageKey: 'k1' });
    const done = measureImage(controller(), 'i', 'k1', resolveAssetUrl);
    await measured('/cdn/k1', { width: 8, height: 6 });
    await act(() => done);
    expect(imageData()).toEqual({ storageKey: 'k1', alt: '', width: 8, height: 6 });
  });

  it('measures nothing when the host cannot resolve the key', async () => {
    held();
    const { controller, changes } = mountImage({ storageKey: 'k1' });
    const broken = () => {
      throw new Error('no such key');
    };
    await act(() => measureImage(controller(), 'i', 'k1', broken));
    expect(intrinsicSize).not.toHaveBeenCalled();
    expect(changes).toEqual([]);
  });
});
