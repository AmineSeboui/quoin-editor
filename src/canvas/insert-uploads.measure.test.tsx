import { act, waitFor } from '@testing-library/react';
import { intrinsicSize } from '../blocks/intrinsic-size';
import { mountCanvas, paragraph } from '../blocks/void/test-canvas';
import type { UploadFn } from '../types';

vi.mock('../blocks/intrinsic-size');

const stored: UploadFn = async (file) => ({ storageKey: `key/${file.name}`, filename: file.name, size: file.size });
const resolveAssetUrl = (key: string) => `/cdn/${key}`;

describe('images pasted or dropped on the canvas', () => {
  it('land with their key, then get the size measured from the address the host gives the key', async () => {
    vi.mocked(intrinsicSize).mockImplementation(async (src) => (src === '/cdn/key/cat.png' ? { width: 40, height: 30 } : null));
    const { handle, last } = mountCanvas([paragraph('a', 'one')], { upload: stored, resolveAssetUrl });
    const files = [new File(['png'], 'cat.png', { type: 'image/png' }), new File(['png'], 'dog.png', { type: 'image/png' })];
    act(() => handle().controller.onFiles?.(files, { block: 'a', region: 'text', offset: 0 }));
    await waitFor(() => expect(last()[1].data).toEqual({ storageKey: 'key/cat.png', alt: '', width: 40, height: 30 }));
    expect(last()[2].data).toEqual({ storageKey: 'key/dog.png', alt: '' });
    expect(intrinsicSize).toHaveBeenCalledWith('/cdn/key/dog.png');
  });
});
