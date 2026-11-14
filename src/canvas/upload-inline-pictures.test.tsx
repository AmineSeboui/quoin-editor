import { act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { intrinsicSize } from '../blocks/intrinsic-size';
import { mountCanvas, paragraph } from '../blocks/test-support/test-canvas';
import type { Extension, Transaction } from '../engine';
import type { QuoinBlock, UploadFn } from '../types';
import { MAX_INLINE_PICTURE_BYTES } from './inline-picture';

vi.mock('../blocks/intrinsic-size');

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const PASTE = `<p>Above</p><img src="${PNG}" alt="Cat"><p>Below</p>`;
const stored: UploadFn = async (file) => ({ storageKey: `key/${file.name}`, filename: file.name, size: file.size });

function pasteInto(props: Parameters<typeof mountCanvas>[1], html: string) {
  const committed: Transaction[] = [];
  const spy: Extension = { name: 'spy', onTransaction: (tr) => void committed.push(tr) };
  const mounted = mountCanvas([paragraph('a', '')], { extensions: [spy], ...props });
  act(() => void mounted.handle().controller.editor.paste({ html }));
  return { ...mounted, committed };
}

const shape = (blocks: QuoinBlock[]) =>
  blocks.map(({ type, data }) => (type === 'MARKDOWN' ? data.markdown : { type, ...data }));

afterEach(() => vi.unstubAllGlobals());

describe('pictures a paste carries inline', () => {
  it('are uploaded and put in where they were once the upload is in, and their data is never in the document', async () => {
    vi.mocked(intrinsicSize).mockResolvedValue({ width: 40, height: 30 });
    const upload = vi.fn(stored);
    const { last, changes, committed } = pasteInto({ upload, resolveAssetUrl: (key) => `/cdn/${key}` }, PASTE);
    expect(shape(last())).toEqual(['Above', 'Below']);
    const picture = { type: 'IMAGE', storageKey: 'key/image.png', alt: 'Cat', width: 40, height: 30 };
    await waitFor(() => expect(shape(last())).toEqual(['Above', picture, 'Below']));
    expect(upload).toHaveBeenCalledTimes(1);
    const [file, kind] = upload.mock.calls[0];
    expect([file.name, file.type, file.size]).toEqual(['image.png', 'image/png', 8]);
    expect(kind).toBe('image');
    expect(JSON.stringify([changes, committed.map((tr) => tr.steps)])).not.toContain('base64');
  });

  it('keep their order whatever order their uploads end in', async () => {
    const later: UploadFn = (file) => new Promise((done) => setTimeout(() => void done(stored(file, 'image')), 20));
    const upload = vi.fn<UploadFn>().mockImplementationOnce(later).mockImplementationOnce(stored);
    const html = `<p>Above</p><img src="${PNG}" alt="1"><img src="${PNG.replace('png', 'gif')}" alt="2"><p>Below</p>`;
    const { last } = pasteInto({ upload }, html);
    await waitFor(() => expect(last()).toHaveLength(4));
    expect(last().map(({ type, data }) => (type === 'IMAGE' ? data.alt : data.markdown))).toEqual(['Above', '1', '2', 'Below']);
  });

  it('stay out of a canvas with no upload function', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { last } = pasteInto({}, PASTE);
    await act(async () => {});
    expect(shape(last())).toEqual(['Above', 'Below']);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stay out, and the host hears why, when one is too large to read or its upload fails', async () => {
    const fetch = vi.fn(globalThis.fetch);
    vi.stubGlobal('fetch', fetch);
    const onError = vi.fn();
    const upload = vi.fn<UploadFn>().mockRejectedValue(new Error('That file is too large.'));
    const huge = `data:image/png;base64,${'A'.repeat(Math.ceil(MAX_INLINE_PICTURE_BYTES / 3) * 4 + 4)}`;
    const { last } = pasteInto({ upload, onError }, `<p>Above</p><img src="${huge}"><img src="${PNG}"><p>Below</p>`);
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(2));
    expect(onError.mock.calls.map(([error]) => (error as Error).message)).toEqual([
      'A pasted picture is too large to upload.',
      'That file is too large.',
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(PNG);
    expect(shape(last())).toEqual(['Above', 'Below']);
  });

  it('stay out when the block they came after is gone by the time the upload is in', async () => {
    let finish = () => {};
    const upload = vi.fn<UploadFn>((file) => new Promise((done) => (finish = () => void done(stored(file, 'image')))));
    const { handle } = pasteInto({ upload }, PASTE);
    await waitFor(() => expect(upload).toHaveBeenCalled());
    act(() => void handle().editor.setBlocks([paragraph('b', 'Rewritten')]));
    await act(async () => finish());
    expect(shape(handle().editor.getBlocks())).toEqual(['Rewritten']);
  });
});
