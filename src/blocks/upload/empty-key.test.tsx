import { act } from '@testing-library/react';
import type { QuoinBlock, UploadFn } from '../../types';
import { uploadImage } from '../image/image-upload';
import { intrinsicSize } from '../intrinsic-size';
import { mountCanvas, paragraph } from '../test-support/test-canvas';

vi.mock('../intrinsic-size');

const png = new File(['png'], 'cat.png', { type: 'image/png' });
const image: QuoinBlock = { id: 'i', type: 'IMAGE', data: { storageKey: '', alt: '' } };
const resolveAssetUrl = (key: string) => `/cdn/${key}`;
const answering = (storageKey: unknown): UploadFn =>
  async (file) => ({ storageKey, filename: file.name, size: file.size }) as Awaited<ReturnType<UploadFn>>;

beforeEach(() => {
  vi.mocked(intrinsicSize).mockReset().mockResolvedValue({ width: 40, height: 30 });
});

const run = (upload: UploadFn) => {
  const canvas = mountCanvas([paragraph('a', 'above'), image], { upload, resolveAssetUrl });
  const controller = canvas.handle().controller;
  return () => act(() => uploadImage(controller, 'i', png, { upload, resolveAssetUrl }));
};

/**
 * A host that answers an upload with nothing stored has failed it, and the block words that failure itself. An empty
 * key is the same failure written as a string, and it passed the guard, so the upload resolved as though it had
 * worked and the block was left empty with nothing said.
 */
describe('an upload a host answers with no key', () => {
  it.each([
    ['an empty key', ''],
    ['no key at all', undefined],
    ['something that is not a key', 42],
  ])('fails the upload, given %s', async (_case, key) => {
    await expect(run(answering(key))()).rejects.toThrow();
  });

  it('still lands an upload the host answers with a key', async () => {
    await run(answering('key-cat.png'))();
  });
});
