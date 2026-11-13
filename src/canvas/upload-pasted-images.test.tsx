import { act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { intrinsicSize } from '../blocks/intrinsic-size';
import { mountCanvas, paragraph } from '../blocks/void/test-canvas';
import type { UploadFn } from '../types';

vi.mock('../blocks/intrinsic-size');

const stored: UploadFn = async (file) => ({ storageKey: `key/${file.name}`, filename: file.name, size: file.size });
const picture = (type = 'image/png') => ({ ok: true, blob: async () => new Blob(['png'], { type }) });
const PASTE = '<p>Above</p><img src="https://images.example/docs/cat.png?size=2" alt="Cat"><p>Below</p>';

function pasteInto(props: Parameters<typeof mountCanvas>[1], data: { html?: string; json?: string }) {
  const mounted = mountCanvas([paragraph('a', '')], props);
  act(() => void mounted.handle().controller.editor.paste(data));
  return mounted;
}

const image = (blocks: { type: string; data: Record<string, unknown> }[]) => blocks.find(({ type }) => type === 'IMAGE')?.data;

afterEach(() => vi.unstubAllGlobals());

describe('pictures in HTML pasted from another document', () => {
  it('are read and uploaded into their image blocks, and lose the link', async () => {
    const fetch = vi.fn(async () => picture());
    vi.stubGlobal('fetch', fetch);
    vi.mocked(intrinsicSize).mockResolvedValue({ width: 40, height: 30 });
    const upload = vi.fn(stored);
    const { last } = pasteInto({ upload, resolveAssetUrl: (key) => `/cdn/${key}` }, { html: PASTE });
    await waitFor(() => expect(image(last())).toEqual({ storageKey: 'key/cat.png', alt: 'Cat', width: 40, height: 30 }));
    expect(fetch).toHaveBeenCalledWith('https://images.example/docs/cat.png?size=2');
    expect(upload.mock.calls[0][0]).toMatchObject({ name: 'cat.png', type: 'image/png' });
  });

  it('stay linked when the canvas has no upload function or the page cannot read them', async () => {
    const fetch = vi.fn(async () => picture('text/html'));
    vi.stubGlobal('fetch', fetch);
    const linked = { storageKey: '', alt: 'Cat', url: 'https://images.example/docs/cat.png?size=2' };
    expect(image(pasteInto({}, { html: PASTE }).last())).toEqual(linked);
    expect(fetch).not.toHaveBeenCalled();

    const upload = vi.fn(stored);
    const { last } = pasteInto({ upload }, { html: PASTE });
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    pasteInto({ upload }, { html: PASTE });
    fetch.mockResolvedValue({ ok: false, blob: async () => new Blob([]) } as never);
    pasteInto({ upload }, { html: '<img src="https://images.example/missing">' });
    await act(async () => {});
    expect(upload).not.toHaveBeenCalled();
    expect(image(last())).toEqual(linked);
  });

  it('report a failed upload and stay linked', async () => {
    vi.stubGlobal('fetch', async () => picture());
    const onError = vi.fn();
    const refused: UploadFn = async () => {
      throw new Error('That file is too large.');
    };
    pasteInto({ upload: refused, onError }, { html: PASTE });
    const keyless = pasteInto({ upload: async () => ({}) as never, onError }, { html: '<img src="https://images.example/">' });
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(2));
    expect(onError.mock.calls.map(([error]) => (error as Error).message)).toEqual(['That file is too large.', 'Upload failed.']);
    expect(image(keyless.last())).toMatchObject({ url: 'https://images.example/' });
  });

  it('are left alone when they come from the editor itself', async () => {
    const fetch = vi.fn(async () => picture());
    vi.stubGlobal('fetch', fetch);
    const slice = {
      blocks: [{ id: 'i', type: 'IMAGE', data: { storageKey: '', alt: '', url: 'https://images.example/linked.png' } }],
      openStart: false,
      openEnd: false,
    };
    const { last } = pasteInto({ upload: stored }, { json: JSON.stringify({ quoin: 1, slice }) });
    await act(async () => {});
    expect(fetch).not.toHaveBeenCalled();
    expect(image(last())).toMatchObject({ url: 'https://images.example/linked.png' });
  });
});
